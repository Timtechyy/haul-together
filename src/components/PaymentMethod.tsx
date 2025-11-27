import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
interface Props {
  role:String;
}
export default function SetupIntentForm({role }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (setupIntent?.status === "succeeded" && role==="driver")  {
      // setupIntent.payment_method is the ID you can use server-side
      // Setup succeeded, Payment Method attached to the Customer
      const { data, error } =  await supabase.functions.invoke("create-bank-account", {
          body: {paymentMethodId: setupIntent.payment_method,}
        });
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        onClick={handleSubmit}
        disabled={!stripe || loading}
        className="bg-black text-white px-4 py-2 rounded-md w-full"
      >
        Add Card
      </button>
    </div>
  );
}
