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
  mode: "driver" | "user";
  driverId?: string;
}


const DeliveryMap: React.FC<DeliveryMapProps> = ({booking, mode, driverId}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const lastDriverPosition = useRef<[number, number] | null>(null);
  const [followDriver, setFollowDriver] = useState(true);
  const [loading, setLoading] = useState(true);
  const directionsRef = useRef<any>(null);

  /* ---------------- MAP INIT ---------------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      // const { data } = await supabase.functions.invoke("get-mapbox-token");
      const { data: driverLocation } = await supabase.from("driver_vehicles").select("current_lng, current_lat").eq("user_id", driverId).single();
      mapboxgl.accessToken = "pk.eyJ1Ijoid2VoYXVsZXIiLCJhIjoiY21pbHZyMXlmMDl4MzNkcHVyb21nMHV4eCJ9.V5eUmLUwnEdScdxfALmSqQ";

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
          instructions: false // Hides the turn-by-turn text
        }

      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      
      
      mapRef.current.on("load", () => {
       // const newPos: [number, number] = [driverLocation.current_lng, driverLocation.current_lat];
       
        addPickupAndDropoff(); 
        if (driverLocation?.current_lng && driverLocation?.current_lat) {
          driverMarkerRef.current = createDriverMarker([
            driverLocation.current_lng,
            driverLocation.current_lat
          ]);
        }
        mapRef.current!.addControl(directionsRef.current, "top-left");
        directionsRef.current.setOrigin([booking.pickupLng, booking.pickupLat]);
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

    const channel = supabase
      .channel("driver-location")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "driver_vehicles", 
        filter: `user_id=eq.${driverId}` 
      }, 
      (payload) => {
        const { current_lat, current_lng } = payload.new as any;
        if (!current_lat || !current_lng) return;
        const newPos: [number, number] = [current_lng, current_lat];

        // 1. Update Marker & Camera
        if (driverMarkerRef.current) animateMarker(driverMarkerRef.current, newPos);
        if (followDriver) mapRef.current?.easeTo({ center: newPos, duration: 1000 });

        // 2. Precise Distance Check using Turf
        const from = point([newPos[0], newPos[1]]);
        const to = point([booking.pickupLng, booking.pickupLat]);
        const options = { units: 'meters' as const };
        
        const distanceInMeters = distance(from, to, options);

        // 3. Threshold Logic (e.g., 100 meters)
        const hasReachedPickup = distanceInMeters < 100;

        // 4. Update the Polyline via the Directions Plugin
        directionsRef.current.setOrigin(newPos);
        
        if (hasReachedPickup) {
          // Change destination to final delivery once at pickup
          directionsRef.current.setDestination([booking.deliveryLng, booking.deliveryLat]);
        } else {
          // Still heading to pickup
          directionsRef.current.setDestination([booking.pickupLng, booking.pickupLat]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId, booking]);


  /* ---------------- DRIVER ICON ---------------- */
  const createDriverMarker = (lngLat: [number, number]) => {
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

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default DeliveryMap;
