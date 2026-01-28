import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * CONFIG
 */
const MIN_DISTANCE_METERS = 15;
const MIN_TIME_MS = 5000;

/**
 * Check if user is a driver
 */
const isDriver = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) return false;
  return data?.role === "driver";
};

/**
 * Haversine distance
 */
const getDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Hook
 */
export const useLocationTracking = (userId: string | null) => {
  const [isTracking, setIsTracking] = useState(false);
  const locationRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{
    lat: number;
    lng: number;
    time: number;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!userId || watchIdRef.current) return;

    let cancelled = false;

     const startTracking = async () => {
      const driver = await isDriver(userId);
      if (!driver || cancelled) return;



      if (!navigator.geolocation) {
        toast({
          title: "Location not supported",
          description: "Your browser does not support GPS",
          variant: "destructive",
        });
        return;
      }

      await supabase.realtime.setAuth()

      locationRef.current = supabase.channel(`driver:${userId}`, );
      await locationRef.current.subscribe((status, err)=>{if (status==='SUBSCRIBED'){
        console.log('Successfully subscribed to location updates');
      }});
     

      // Mark online immediately
      await supabase
        .from("driver_vehicles")
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq("user_id", userId);

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading; 
          const speed = pos.coords.speed;
          const now = Date.now();

          console.log("Geolocation update:", { lat, lng, heading, speed});

          locationRef.current.send({
            type: "broadcast",
            event: `${userId}-location-update`,
            payload: { 
              longitude:lng,
              latitude:lat,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              ts: now,
            },
            is_private:true,
          }); 

          if (lastSentRef.current) {    
            const distance = getDistanceMeters(
              lastSentRef.current.lat,
              lastSentRef.current.lng,
              lat,
              lng
            );

            const timeDiff = now - lastSentRef.current.time;

            if (distance < MIN_DISTANCE_METERS && timeDiff < MIN_TIME_MS) {
              return;
            }
          }

          lastSentRef.current = { lat, lng, time: now };
          await updateLocation(userId, lat, lng);
        },
        (err) => {

          console.error("Geolocation error:", err);
          setIsTracking(false);
          toast({
            title: "Location Error",
            description: "Unable to track location",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 20000,
        }
      );
      setIsTracking(true);
    };
    startTracking();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationRef.current) {
        supabase.removeChannel(locationRef.current);
        locationRef.current = null;
      }
      lastSentRef.current = null;
      setIsTracking(false);
    };
  }, [userId, toast]);

  return { isTracking };
};


/**
 * Update DB
 */
const updateLocation = async (
  userId: string,
  lat: number,
  lng: number
) => {
  await supabase
    .from("driver_vehicles")
    .update({
      current_lat: lat,
      current_lng: lng,
      last_seen: new Date().toISOString(),
      last_location_update: new Date().toISOString(),
      is_online: true,
    })
    .eq("user_id", userId);
};

