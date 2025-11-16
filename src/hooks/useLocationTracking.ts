import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLocationTracking = (userId: string | undefined, isActive: boolean) => {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !isActive) {
      setIsTracking(false);
      return;
    }

    let watchId: number | null = null;

    const startTracking = async () => {
      if (!navigator.geolocation) {
        toast({
          title: "Location not supported",
          description: "Your browser doesn't support location tracking",
          variant: "destructive",
        });
        return;
      }

      try {
        // Request permission and get initial location
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            setLocation({ lat, lng });
            setIsTracking(true);

            // Update location in database
            await updateLocation(userId, lat, lng);

            // Set up continuous tracking
            watchId = navigator.geolocation.watchPosition(
              async (pos) => {
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;
                
                setLocation({ lat: newLat, lng: newLng });
                await updateLocation(userId, newLat, newLng);
              },
              (error) => {
                console.error('Location tracking error:', error);
                setIsTracking(false);
              },
              {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 27000,
              }
            );
          },
          (error) => {
            console.error('Location permission error:', error);
            toast({
              title: "Location permission denied",
              description: "Please enable location access to receive delivery requests",
              variant: "destructive",
            });
          }
        );
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userId, isActive, toast]);

  return { isTracking, location };
};

const updateLocation = async (userId: string, lat: number, lng: number) => {
  try {
    const { error } = await supabase
      .from('driver_vehicles')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating location:', error);
    }
  } catch (error) {
    console.error('Error updating location:', error);
  }
};
