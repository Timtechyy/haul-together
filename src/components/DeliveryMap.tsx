import React, { useEffect, useRef, useState } from 'react';
import mapboxgl, { LngLat } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import { supabase } from '@/integrations/supabase/client';

interface BookingProps {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  pickupAddress: string;
  deliveryAddress: string;
}

interface DeliveryMapProps {
  booking:BookingProps;
  mode: "driver" | "customer";
  driverId?: string;
  onDriverAction?: (action:string) => Promise<void>;
}


const DeliveryMap: React.FC<DeliveryMapProps> = ({booking, mode, driverId, onDriverAction}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [followDriver, setFollowDriver] = useState(true);
  const [loading, setLoading] = useState(true);
  const directionsRef = useRef<any>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [etaType, setEtaType] = useState<"pickup" | "delivery">("pickup");


  /* ---------------- MAP INIT ---------------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      // const { data } = await supabase.functions.invoke("get-mapbox-token");
     
      mapboxgl.accessToken = "pk.eyJ1Ijoid2VoYXVsZXIiLCJhIjoiY21pbHZyMXlmMDl4MzNkcHVyb21nMHV4eCJ9.V5eUmLUwnEdScdxfALmSqQ";
      const { data: driverLocation } = await supabase
      .from("driver_vehicles")
      .select("*")
      .eq("user_id", driverId)
      .single();
      // console.log("driver current location", driverLocation.current_lat, driverLocation.current_lng);
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [
          (booking.pickupLng + booking.deliveryLng) / 2,
          (booking.pickupLat + booking.deliveryLat) / 2,
        ],
        zoom: 12,
      });
      // 2. Initialize Directions
      directionsRef.current = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: 'mapbox/driving',
        interactive: false,
        controls: {
          inputs: false,      // Hides the search boxes
          instructions: mode === "driver" ? true : false // Hides the turn-by-turn text
        }

      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-left");
      
      
      mapRef.current.on("load", () => {
       // const newPos: [number, number] = [driverLocation.current_lng, driverLocation.current_lat];
       
        addPickupAndDropoff(); 
        if (driverLocation?.current_lng && driverLocation?.current_lat) {
          driverMarkerRef.current = createDriverMarker([
            driverLocation.current_lng,
            driverLocation.current_lat
          ], heading);
        }
        mapRef.current!.addControl(directionsRef.current, "top-right");   
        // directionsRef.current.setOption({
        //   routeLineColor: "#2563eb",
        //   routeLineWidth: 6,
        // });
        directionsRef.current.setOrigin([driverLocation.current_lng, driverLocation.current_lat]);
        directionsRef.current.addWaypoint(1, [booking.pickupLng, booking.pickupLat]);
        directionsRef.current.setDestination([booking.deliveryLng, booking.deliveryLat]);
      });
    };

    initMap();

    return () => {
      mapRef.current?.remove();
    };
     
        
  }, [driverId]);

  /* ---------------- MARKERS ---------------- */
  const addPickupAndDropoff = () => {
    if (!mapRef.current) return;

    new mapboxgl.Marker({ color: "#22c55e" })
      .setLngLat([booking.pickupLng, booking.pickupLat])
      // .setPopup(new mapboxgl.Popup().setText("Pickup"))
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div class="p-2 text-sm, text-black"><strong>Pickup</strong><br/>${booking.pickupAddress}</div>`)
      )
      .addTo(mapRef.current);

    new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat([booking.deliveryLng, booking.deliveryLat])
      // .setPopup(new mapboxgl.Popup().setText("Delivery"))
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<div class="p-2 text-sm, text-black"><strong>Delivery</strong><br/>${booking.deliveryAddress}</div>`)
      )
      .addTo(mapRef.current);
  };

  /* ---------------- DRIVER REALTIME ---------------- */
  useEffect(() => {
    if (!driverId || !directionsRef.current) return;
    const startLsitening = async () => {
      await supabase.realtime.setAuth()
      const channel = supabase
        .channel(`driver:${driverId}`,)
        .on("broadcast", { 
          event: `${driverId}-location-update`,
        }, 
        (payload) => {
          // console.log("Received driver location update:", payload);
          // const { lat, lng } = payload.new as any;
          // if (!current_lat || !current_lng) return;
          const newPos: [number, number] = [payload.longitude, payload.latitude];
          setHeading(payload.heading);

          // 1. Update Marker & Camera
          if (driverMarkerRef.current) {animateMarker(driverMarkerRef.current, newPos)};
          if (followDriver) {mapRef.current?.easeTo({ center: newPos, duration: 1000 })};

          // 2. Precise Distance Check using Turf
          const from = point([newPos[0], newPos[1]]);
          const to = point([booking.pickupLng, booking.pickupLat]);
          const options = { units: 'meters' as const };
          
          const distanceInMeters = distance(from, to, options);

          // 3. Threshold Logic (e.g., 100 meters)
          const headingToPickup = distanceInMeters <= 500 && distanceInMeters > 100;
          const hasReachedPickup = distanceInMeters <= 0;

          // 4. Update the Polyline via the Directions Plugin
          directionsRef.current.setOrigin(newPos);
          
          if (hasReachedPickup) {
            // Change destination to final delivery once at pickup
           const from = point([newPos[0], newPos[1]]);
           const to = point([booking.deliveryLng, booking.deliveryLat]);
            const options = { units: 'meters' as const };
            const distanceToDelivery = distance(from, to, options);

            const etaSeconds = calculateETASeconds(distanceToDelivery, payload.speed);

            if (etaSeconds) {
              setEtaText(`Delivering in ${formatETA(etaSeconds)}`);
              setEtaType("delivery");
            } else {
              setEtaText("Calculating delivery ETA…");
            }
            directionsRef.current.removeWayPoint();
            onDriverAction("in_transit");
            // console.log("Driver has reached pickup");
          } else if (headingToPickup) {
            // Driver is heading to pickup

             const from = point([newPos[0], newPos[1]]);
           const to = point([booking.pickupLng, booking.pickupLat]);
            const options = { units: 'meters' as const };
            const distanceToDelivery = distance(from, to, options);

            const etaSeconds = calculateETASeconds(distanceToDelivery, payload.speed);

            if (etaSeconds) {
              setEtaText(`Delivering in ${formatETA(etaSeconds)}`);
              setEtaType("delivery");
            } else {
              setEtaText("Calculating delivery ETA…");
            }
            onDriverAction("picking_up");   
            // console.log("Driver is heading to pickup");
          } 
          
          //else {
          //   // Still heading to pickup
          //   directionsRef.current.setDestination([booking.pickupLng, booking.pickupLat]);
          // }
        })
        .subscribe(
          (status, err) => {  
            if (status === 'SUBSCRIBED') {
              // console.log('Successfully subscribed to delivery updates');
            } else if (status === 'CHANNEL_ERROR') {
              // console.error('Channel error - subscription failed', err);
            } else if (status === 'TIMED_OUT') {
              // console.error('Subscription timed out');
            } else if (status === 'CLOSED') {
              // console.log('🔌 Channel closed');
            }
          }
        );

      return () => {
        supabase.removeChannel(channel); 
        if (driverMarkerRef.current) {
          driverMarkerRef.current.remove();
          driverMarkerRef.current = null;
        }
      };
    };
    startLsitening();
  }, [driverId, booking]);


  /* ---------------- DRIVER ICON ---------------- */
  const createDriverMarker = (lngLat: [number, number,], heading: number) => {
    const el = document.createElement("div");
    el.className = "driver-marker";
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background: #2563eb;
        border-radius: 50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:18px;
      ">
        🚗
      </div>
    `;
    el.style.transform = `rotate(${heading ?? 0}deg)`;
    return new mapboxgl.Marker(el)
      .setLngLat(lngLat)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div class="p-2 text-sm, text-black"><strong>Driver Location</strong><br/></div>`)
      )
    
      .addTo(mapRef.current!);
  }; 

  /* ---------------- SMOOTH ANIMATION ---------------- */
  const animateMarker = (
    marker: mapboxgl.Marker,
    to: [number, number]
  ) => {
    const from = marker.getLngLat();
    const frames = 30;
    let step = 0;

    const animate = () => {
      step++;
      const lng =
        from.lng + (to[0] - from.lng) * (step / frames);
      const lat =
        from.lat + (to[1] - from.lat) * (step / frames);

      marker.setLngLat([lng, lat]);

      if (step < frames) requestAnimationFrame(animate);
    };

    animate();
  };

  const calculateETASeconds = (
    distanceMeters: number,
    speedMps: number | null
  ) => {
    if (!speedMps || speedMps < 1) return null;
    return Math.round(distanceMeters / speedMps);
  };

  const formatETA = (seconds: number) => {
    const mins = Math.ceil(seconds / 60);
    return mins <= 1 ? "1 min" : `${mins} mins`;
  };



  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
      {etaText && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`
              px-4 py-2 rounded-full shadow-lg text-sm font-medium
              flex items-center gap-2
              ${etaType === "pickup"
                ? "bg-blue-600 text-white"
                : "bg-green-600 text-white"}
            `}
          >
            ⏱ {etaText}
          </div>
        </div>
      )}

      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default DeliveryMap;
