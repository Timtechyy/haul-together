import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
interface Props {
  role: string;
  clientSecret: string;
}
export default function SetupIntentForm({ role, clientSecret }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (role: string) => {
    if (!stripe || !elements) return;
    console.log("adding payment method for:", role);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    console.log(setupIntent.status);

    if (setupIntent?.status === "succeeded" && role === "driver") {
      // setupIntent.payment_method is the ID you can use server-side
      // Setup succeeded, Payment Method attached to the Customer
      const { data, error } = await supabase.functions.invoke("create-bank-account", {
        body: { paymentMethodId: setupIntent.payment_method },
      });
    }

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  // const submit =async()=>{
  //   const { error, financialConnectionsSession } = await stripe.collectFinancialConnectionsAccounts({clientSecret})
  //     if (financialConnectionsSession.id)  {
  //       // setupIntent.payment_method is the ID you can use server-side
  //       // Setup succeeded, Payment Method attached to the Customer
  //       const { data, error } =  await supabase.functions.invoke("create-bank-account", {
  //           body: {paymentMethodId: financialConnectionsSession.id,}
  //         });
  //     }
  // };

  // const pay= async() => {

  // if (role ==="driver") {
  //   const { error, setupIntent } = await stripe.collectBankAccountForSetup(
  //   {
  //     clientSecret,
  //     params: {
  //       payment_method_type: 'us_bank_account',
  //       payment_method_data: {
  //         billing_details: {
  //         // name is required
  //         name: 'Jenny Rosen',
  //         email: 'jenny@example.com',
  //       },
  //       },
  //     },
  //   }
  // );
  //  if (setupIntent?.status === "succeeded" && role==="driver")  {
  //   // setupIntent.payment_method is the ID you can use server-side
  //   // Setup succeeded, Payment Method attached to the Customer
  //   const { data, error } =  await supabase.functions.invoke("create-bank-account", {
  //       body: {paymentMethodId: setupIntent.payment_method,}
  //     });
  // }
  // }
  // }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        onClick={() => handleSubmit(role)}
        disabled={!stripe || loading}
        className="bg-black text-white px-4 py-2 rounded-md w-full"
      >
        Add Card
      </button>
    </div>
  );
}
