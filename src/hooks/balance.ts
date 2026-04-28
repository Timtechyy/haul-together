import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type StripeBalanceAmount = {
  amount: number;
  currency: string;
};

export type StripeBalance = {
  available: StripeBalanceAmount[];
  instant_available?: StripeBalanceAmount[];
  pending?: StripeBalanceAmount[];
};

export function useBalance(stripeConnectId?: string) {
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!stripeConnectId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "get-driver-balance",
        { body: { id: stripeConnectId } }
      );

      if (error) throw error;

      setBalance(data);
    } catch (err) {
      console.error("Balance error:", err);
    } finally {
      setLoading(false);
    }
  }, [stripeConnectId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    reload: fetchBalance,
  };
}




// export function getBalance(stripeConnectId:string) {
//   const [balance, setBalance] = useState<StripeBalance|null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // if () return;

//     const load = async () => {
//       setLoading(true);
//         const { data, error } =  await supabase.functions.invoke("get-driver-balance", {body:{id:stripeConnectId}});
//       if (error) throw error;
//       setBalance(data);
//       setLoading(false);
//     };

//     load();
//   });

//   return { balance, loading, reload: () => setLoading(true) };
// }
