import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";

export default function PaymentForm({ clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <PaymentElement />

      <button
        onClick={handleSubmit}
        disabled={!stripe || loading}
        className="bg-black text-white px-4 py-2 rounded-md w-full"
      >
        Pay Now
      </button>
    </div>
  );
}
