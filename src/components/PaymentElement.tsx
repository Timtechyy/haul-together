import React from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

type PaymentFormProps = {
  onSuccess?: () => void;
  onFailure?: (failed: boolean) => void; // <-- callback to parent
};

export default function PaymentForm({ onSuccess, onFailure }:PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);

    try{    
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (error) {
        onFailure(true);
        setRetry(true);
        throw error;
        // alert(error.message);
        // setLoading(false);
        // return;
      }

      if (paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successfull",
          description: "Drivers would be Notified ",
        });
        onSuccess();
      }
    } catch(error){
      onFailure(true);
      setRetry(true);
      toast({ 
        title: "Opps Payment Unsuccessful", 
        description: "Sorry Payment Wasn't successful please retry", 
        variant: "destructive" 
      });
    } finally{
      setLoading(false);
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
        {retry?"Retry payment":"Pay Now"} 
      </button>
    </div>
  );
}







