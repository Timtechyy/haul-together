import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryMapProps {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  pickupAddress: string;
  deliveryAddress: string;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  pickupAddress,
  deliveryAddress,
}) => {
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
          center: [(pickupLng + deliveryLng) / 2, (pickupLat + deliveryLat) / 2],
          zoom: 11,
        });

        // Add pickup marker
        const pickupMarker = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([pickupLng, pickupLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Pickup</strong><br/>${pickupAddress}</div>`)
          )
          .addTo(map.current);

        // Add delivery marker
        const deliveryMarker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([deliveryLng, deliveryLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Delivery</strong><br/>${deliveryAddress}</div>`)
          )
          .addTo(map.current);

        // Fit map to show both markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pickupLng, pickupLat]);
        bounds.extend([deliveryLng, deliveryLat]);
        
        map.current.fitBounds(bounds, {
          padding: 50,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        setLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      map.current?.remove();
    };
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng, pickupAddress, deliveryAddress]);

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
