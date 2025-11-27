import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentMethods() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if () return;

    const load = async () => {
      setLoading(true);
        const { data, error } =  await supabase.functions.invoke("get-payment-methods");
      if (error) throw error;
      setMethods(data.paymentMethods || []);
      setLoading(false);
    };

    load();
  });

  return { methods, loading, reload: () => setLoading(true) };
}
