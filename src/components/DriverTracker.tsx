import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { LocationTrackingContext } from "@/components/locationtracking";


export default function DriverTracker({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 👇 HOOK RUNS ONCE, GLOBALLY
  const { isTracking } = useLocationTracking(userId);

  return (
    <LocationTrackingContext.Provider value={{ isTracking }}>
      {children}
    </LocationTrackingContext.Provider>
  );
}