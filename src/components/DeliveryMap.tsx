import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        // Get Mapbox token from edge function
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) throw error;

        mapboxgl.accessToken = data.token;

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [(booking.pickupLng + booking.deliveryLng) / 2, (booking.pickupLat + booking.deliveryLat) / 2],
          zoom: 11,
        });

        // Add pickup marker
        const pickupMarker = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([booking.pickupLng, booking.pickupLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Pickup</strong><br/>${booking.pickupAddress}</div>`)
          )
          .addTo(map.current);

        // Add delivery marker
        const deliveryMarker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([booking.deliveryLng, booking.deliveryLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Delivery</strong><br/>${booking.deliveryAddress}</div>`)
          )
          .addTo(map.current);

        // Fit map to show both markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([booking.pickupLng, booking.pickupLat]);
        bounds.extend([booking.deliveryLng, booking.deliveryLat]);
        
        map.current.fitBounds(bounds, {
          padding: 50,
        });

        const channel = supabase
        .channel("driver-location")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "driver_vehicles",
            filter: `user_id=eq.${driverId}`,
          },
          (payload) => {
            const { current_lat, current_lng } = payload.new as any;
            
            const driverMarker  = new mapboxgl.Marker({
                color: "#2563eb",
              })
              .setLngLat([current_lng, current_lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Delivery</strong><br/>${booking.deliveryAddress}</div>`))
              .addTo(map.current!);
            
            
            // Auto-center map slightly toward destination
            // const target = getTargetPoint();
            // map.current!.easeTo({
            //   center: [
            //     (lng + target[0]) / 2,
            //     (lat + target[1]) / 2,
            //   ],
            //   duration: 800,
            // });
          }
        ).subscribe();

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        setLoading(false);
        return () => {
          supabase.removeChannel(channel);
        };

    
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      map.current?.remove();
    };
  }, [booking.pickupLat, booking.pickupLng, booking.deliveryLat, booking.deliveryLng, booking.pickupAddress, booking.deliveryAddress, driverId]);
  
  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden">
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
