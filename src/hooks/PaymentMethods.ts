import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentMethods(customerId: string | null) {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    const load = async () => {
      setLoading(true);
        const { data, error } =  await supabase.functions.invoke("get-payment-methods");
      if (error) throw error;
      setMethods(data.paymentMethods || []);
      setLoading(false);
    };

    load();
  }, [customerId]);

  return { methods, loading, reload: () => setLoading(true) };
}
