import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { usePaymentMethods } from "@/hooks/PaymentMethods";
import ResponsivePaymentModal  from "@/components/ui/modal";
import SetupIntentModal from "@/components/PaymentMethod";
// import PayoutAccountCollectionButton  from "@/components/ui/payoutmethod";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  role: string;
  balance:string
}

export default function Withdrawal({ role, balance }: Props) {
  const { methods, loading, reload } = usePaymentMethods();
  const [modalSecret, setModalSecret] = useState<string | null>(null);
  const numericBalance = Number(balance);
  const [amount, setAmount] = useState<number>(0);
  const[payoutMethod, setPayoutMethod] = useState<any | null>(null);
 

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);

    if (isNaN(value)) return;

    // Prevent negative values
    if (value < 0) value = 0;

    // Clamp to balance
    if (value > numericBalance) {
      value = numericBalance;
    }

    setAmount(value);
  };



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
      <div className="space-y-10">
          <div className="space-y-2">
            <Input
              id="amount"
              name="amount"
              type="number"
              value={amount}
              min={0}
              max={numericBalance}
              step="0.01"
              onChange={handleAmountChange}
              required
            />

            <div className="flex flex-row items-center justify-between text-lg ">
              <p className="text-sm text-muted-foreground text-center">
                Your Available Balance
              </p>
              ${balance}
            </div>
          </div>
          <div>
            {methods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                You haven’t added a payment method yet.
                </p>
            ) : ( methods.map((m) => { 
               const isSelected = payoutMethod?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setPayoutMethod(m)}
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
                    {isSelected && <Badge>Selected</Badge>}
                    {m.is_default && <Badge variant="secondary">Default</Badge>}
                  </div>
                )
              }
          ))}


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
        </div>
      </div>

      {modalSecret && (
         <ResponsivePaymentModal
          isOpen={!!modalSecret}
          onClose={() => setModalSecret(null)}
          title="Add Payout Method"
          clientSecret={modalSecret}
        >
          <SetupIntentModal role={role}/>
        </ResponsivePaymentModal>
        )
      }

    </>
  );
}
