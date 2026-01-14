import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { usePaymentMethods } from "@/hooks/PaymentMethods";
import ResponsivePaymentModal  from "@/components/ui/modal";
import SetupIntentModal from "@/components/PaymentMethod";
// import PayoutAccountCollectionButton  from "@/components/ui/payoutmethod";
import { supabase } from "@/integrations/supabase/client";
import { PayoutMethod } from "@/contants/paymentMethodTypes";
import clsx from "clsx"

interface Props {
  role: string;
  name: string;
  email: string;
}

export default function PaymentMethods({ role,name, email }: Props) {
  const { methods, loading, reload } = usePaymentMethods();
  const [modalSecret, setModalSecret] = useState<string | null>(null);
    const isCard = (m: PayoutMethod) => m.object === "card"
    const isBank = (m: PayoutMethod) => m.object === "bank_account"
    const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null)


  const handleAddPaymentMethod = async () => {
    // if (!customerId) return;

    // Create a SetupIntent via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("create-setup-intent");

    if (error) {
      alert(error.message);
      return;
    }
    console.log('secret:', data.clientSecret);
    setModalSecret(data.clientSecret);
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
                        You haven’t added a payout method yet.
                      </p>
                    ) : (
                      methods.map((m) => {
                        const isSelected = payoutMethod?.id === m.id
            
                        return (
                          <div
                            key={m.id}
                            onClick={() => setPayoutMethod(m)}
                            className={clsx(
                              "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted"
                            )}
                          >
                            {/* LEFT */}
                            <div className="flex items-center gap-3">
            
                              {/* ICON */}
                              <div className="h-9 w-14 bg-muted rounded flex items-center justify-center text-xs font-medium uppercase">
                                {isCard(m) ? m.card.brand : "BANK"}
                              </div>
            
                              {/* DETAILS */}
                              <div>
                                {isCard(m) ? (
                                  <>
                                    <div className="text-sm font-medium">
                                      •••• {m.card.last4}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Expires {m.card.exp_month}/{m.card.exp_year}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm font-medium">
                                      {m.bank_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      •••• {m.last4}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
            
                            {/* BADGES */}
                            <div className="flex gap-2">
                              {isSelected && <Badge>Selected</Badge>}
                              {"is_default" in m && m.is_default && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                              {"default_for_currency" in m &&
                                m.default_for_currency && (
                                  <Badge variant="secondary">Default</Badge>
                                )}
                            </div>
                          </div>
                        )
                      })
                    )}
          <Button variant="outline" className="w-full" onClick={handleAddPaymentMethod}>
          Add Payment Method
          </Button>
          {/* {role==='driver'?
          <PayoutAccountCollectionButton
            clientSecret={modalSecret}
            name={name}
            email={email}/>:
            <Button variant="outline" className="w-full" onClick={handleAddPaymentMethod}>
            Add Payment Method
          </Button>} */}
        </CardContent>
      </Card>

      {modalSecret && (
         <ResponsivePaymentModal
          isOpen={!!modalSecret}
          onClose={() => setModalSecret(null)}
          title="Add Payout Method"
          clientSecret={modalSecret}
        >
          <SetupIntentModal role={role} clientSecret={modalSecret}/>
        </ResponsivePaymentModal>
        )
      }

    </>
  );
}
