import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BalanceAmount {
  amount: number;
  currency: string;
}

interface StripeBalance {
  available: BalanceAmount[];
  pending: BalanceAmount[];
}

export function getBalance(stripeConnectId: string) {
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stripeConnectId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("get-driver-balance", { body: { id: stripeConnectId } });
      if (error) throw error;
      setBalance(data);
      setLoading(false);
    };

    load();
  }, [stripeConnectId]);

  return { balance, loading, reload: () => setLoading(true) };
}
