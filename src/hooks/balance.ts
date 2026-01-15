import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function getBalance(stripeConnectId:string) {
  const [balance, setBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if () return;

    const load = async () => {
      setLoading(true);
        const { data, error } =  await supabase.functions.invoke("get-driver-balance", {body:{id:stripeConnectId}});
      if (error) throw error;
      setBalance(data);
      setLoading(false);
    };

    load();
  });

  return { balance, loading, reload: () => setLoading(true) };
}
