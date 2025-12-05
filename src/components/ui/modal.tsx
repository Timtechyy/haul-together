import React from "react";
import { X } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/stripe";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  clientSecret?: string;
}

export default function ResponsivePaymentModal({ isOpen, onClose, children, title = "Payment", clientSecret }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#344056] w-full md:w-[480px] rounded-t-2xl md:rounded-xl p-6 shadow-xl animate-slide-up md:animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
            <Elements
                stripe={stripePromise}
                options={{ 
                clientSecret: clientSecret!, 
                appearance: {
                theme: 'night', // 'flat', 'stripe', or 'night'
                variables: {
                  colorPrimary: '#62B6CB',
                  colorText: '#ffffff',
                  colorBackground: '#344056',
                  colorDanger: '#df1b41',
                  fontFamily: 'Arial, sans-serif',
                  borderRadius:'20px'
                },
                rules: {
                  '.Input': {
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    padding: '10px',
                  },
                  '.Label': {
                    fontWeight: 'bold',
                    marginBottom: '5px',
                  },
                },
              }, 
            }}
            >  
                {children}
            </Elements>
        
      </div>
    </div>
  );
}

