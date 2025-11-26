import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { usePaymentMethods } from "@/hooks/PaymentMethods";
import ResponsivePaymentModal  from "@/components/ui/modal";
import SetupIntentModal from "@/components/PaymentMethod";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  customerId: string | null;
}

export default function PaymentMethods({ customerId }: Props) {
  const { methods, loading, reload } = usePaymentMethods(customerId);
  const [modalSecret, setModalSecret] = useState<string | null>(null);

  const handleAddPaymentMethod = async () => {
    // if (!customerId) return;

    // Create a SetupIntent via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("create-setup-intent", {
      body: { customerId },
    });

    if (error) {
      alert(error.message);
      return;
    }

    setModalSecret(data.clientSecret);
  };

  const handleSuccess = () => {
    setModalSecret(null);
    reload();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Manage your payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            {methods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                You haven’t added a payment method yet.
                </p>
            ) : ( methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs font-medium">
                  {m.card.brand.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">•••• {m.card.last4}</div>
                  <div className="text-xs text-muted-foreground">
                    Expires {m.card.exp_month}/{m.card.exp_year}
                  </div>
                </div>
              </div>
              {m.is_default && <Badge variant="secondary">Default</Badge>}
            </div>
          )))}

          <Button variant="outline" className="w-full" onClick={handleAddPaymentMethod}>
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {modalSecret && (
        <ResponsivePaymentModal
          isOpen={!!modalSecret}
          onClose={() => setModalSecret(null)}
          title="Add Payment Method"
          clientSecret={modalSecret}
        >
          <SetupIntentModal/>
        </ResponsivePaymentModal>
      )}
    </>
  );
}
