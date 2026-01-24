import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * CONFIG
 */
const MIN_DISTANCE_METERS = 15; // update only if moved 15m+
const MIN_TIME_MS = 5000;       // or every 5 seconds

/**
 * Distance calculator (Haversine)
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
const markOnline = async (userId: string) => {
  await supabase
    .from("driver_vehicles")
    .update({
      is_online: true,
      last_seen: new Date().toISOString(),
    })
    .eq("user_id", userId);
};

const goOffline = async (userId?: string) => {
  if (!userId) return;

  await supabase
    .from("driver_vehicles")
    .update({
      is_online: false,
      current_lat: null,
      current_lng: null,
    })
    .eq("user_id", userId);
};

/**
 * Hook
 */
export const useLocationTracking = (
  userId: string | undefined,
  isOnline: boolean
) => {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const lastSentRef = useRef<{
    lat: number;
    lng: number;
    time: number;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !isOnline) {
      goOffline(userId);
      stopTracking();
      return;
    }

    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser does not support location tracking",
        variant: "destructive",
      });
      return;
    }
    markOnline(userId);

    startTracking();

    // 👇 Detect tab close / refresh
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      goOffline(userId);
      stopTracking();
    };

  

    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOnline]);

  const handleUnload = () => {
    if (userId) goOffline(userId);
  };

  /**
   * Start GPS tracking
   */
  const startTracking = () => {
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = Date.now();

        setLocation({ lat, lng });

        if (!lastSentRef.current) {
          lastSentRef.current = { lat, lng, time: now };
          await updateLocation(userId!, lat, lng);
          return;
        }

        const distance = getDistanceMeters(
          lastSentRef.current.lat,
          lastSentRef.current.lng,
          lat,
          lng
        );

        const timePassed = now - lastSentRef.current.time;

        if (
          distance >= MIN_DISTANCE_METERS ||
          timePassed >= MIN_TIME_MS
        ) {
          lastSentRef.current = { lat, lng, time: now };
          await updateLocation(userId!, lat, lng);
        }
      },
      (error) => {
        console.error("Location tracking error:", error);
        toast({
          title: "Location Error",
          description: "Unable to track your location",
          variant: "destructive",
        });
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
  };

  /**
   * Stop tracking + cleanup
   */
  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    lastSentRef.current = null;
    setIsTracking(false);

    if (userId) {
      await supabase
        .from("driver_vehicles")
        .update({
          is_online: false,
          current_lat: null,
          current_lng: null,
        })
        .eq("user_id", userId);
    }
  };

  return {
    isTracking,
    location,
  };
};

/**
 * DB update (only for online drivers)
 */
const updateLocation = async (
  userId: string,
  lat: number,
  lng: number
) => {
  const { error } = await supabase
    .from("driver_vehicles")
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      is_online: true,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update driver location:", error);
  }
};

// export const useLocationTracking = (userId: string | undefined, isActive: boolean) => {
//   const [isTracking, setIsTracking] = useState(false);
//   const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const { toast } = useToast();

//   useEffect(() => {
//     if (!userId || !isActive) {
//       setIsTracking(false);
//       return;
//     }

//     let watchId: number | null = null;

//     const startTracking = async () => {
//       if (!navigator.geolocation) {
//         toast({
//           title: "Location not supported",
//           description: "Your browser doesn't support location tracking",
//           variant: "destructive",
//         });
//         return;
//       }

//       try {
//         // Request permission and get initial location
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const lat = position.coords.latitude;
//             const lng = position.coords.longitude;
            
//             setLocation({ lat, lng });
//             setIsTracking(true);

//             // Update location in database
//             await updateLocation(userId, lat, lng);

//             // Set up continuous tracking
//             watchId = navigator.geolocation.watchPosition(
//               async (pos) => {
//                 const newLat = pos.coords.latitude;
//                 const newLng = pos.coords.longitude;
                
//                 setLocation({ lat: newLat, lng: newLng });
//                 await updateLocation(userId, newLat, newLng);
//               },
//               (error) => {
//                 console.error('Location tracking error:', error);
//                 setIsTracking(false);
//               },
//               {
//                 enableHighAccuracy: true,
//                 maximumAge: 30000,
//                 timeout: 27000,
//               }
//             );
//           },
//           (error) => {
//             console.error('Location permission error:', error);
//             toast({
//               title: "Location permission denied",
//               description: "Please enable location access to receive delivery requests",
//               variant: "destructive",
//             });
//           }
//         );
//       } catch (error) {
//         console.error('Error starting location tracking:', error);
//       }
//     };

//     startTracking();

//     return () => {
//       if (watchId !== null) {
//         navigator.geolocation.clearWatch(watchId);
//       }
//     };
//   }, [userId, isActive, toast]);

//   return { isTracking, location };
// };

// const updateLocation = async (userId: string, lat: number, lng: number) => {
//   try {
//     const { error } = await supabase
//       .from('driver_vehicles')
//       .update({
//         current_lat: lat,
//         current_lng: lng,
//         last_location_update: new Date().toISOString(),
//       })
//       .eq('user_id', userId);

//     if (error) {
//       console.error('Error updating location:', error);
//     }
//   } catch (error) {
//     console.error('Error updating location:', error);
//   }
// };
