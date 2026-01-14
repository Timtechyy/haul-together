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
import clsx from "clsx"

interface Props {
  role: string;
  balance:string
}
type CardMethod = {
  id: string
  object: "payment_method"
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default?: boolean
}

type BankMethod = {
  id: string
  object: "bank_account"
  bank_name: string
  last4: string
  available_payout_methods: string[]
  default_for_currency?: boolean
}

type PayoutMethod = CardMethod | BankMethod




export default function WithdrawWidget({role, balance }: Props) {
  const numericBalance = Number(balance)
  const isCard = (m: PayoutMethod) => m.object === "payment_method"
  const isBank = (m: PayoutMethod) => m.object === "bank_account"
  const [amount, setAmount] = useState("")
  const { methods, loading, reload } = usePaymentMethods();
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null)
  const [modalSecret, setModalSecret] = useState<string | null>(null)

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

  const handleWithdrawal= async()=>{
       const { data, error } = await supabase.functions.invoke("create-payout", {
        body:{amount:amount , destination:payoutMethod.id ,}});

    if (error) {
      alert(error.message);
      return;
    }
    console.log('secret:', data.clientSecret);
    setModalSecret(data.clientSecret);
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value)

    if (isNaN(value)) {
      setAmount("")
      return
    }

    if (value > numericBalance) {
      value = numericBalance
    }

    if (value < 0) value = 0

    setAmount(value.toString())
  }

  return (
    <div className="space-y-10">

      {/* Amount Input */}
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
          className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Your Available Balance
          </span>
          <span className="font-medium">${numericBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Payout Methods */}
      <div className="space-y-3">
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

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleWithdrawal()}
        >
          Add Payout Method
        </Button>
      </div>

      {/* Withdraw Button */}
      {payoutMethod && (
        <Button
          className="w-full"
          disabled={!amount || Number(amount) <= 0}
          onClick={handleWithdrawal}
        >
          Withdraw ${amount}
        </Button>
      )}
    </div>
  )
}


// export default function Withdrawal({ role, balance }: Props) {
//   const { methods, loading, reload } = usePaymentMethods();
//   const [modalSecret, setModalSecret] = useState<string | null>(null);
//   const numericBalance = Number(balance);
//   const [amount, setAmount] = useState<number>(0);
//   const[payoutMethod, setPayoutMethod] = useState<any | null>(null);
 

//   const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let value = Number(e.target.value);

//     if (isNaN(value)) return;

//     // Prevent negative values
//     if (value < 0) value = 0;

//     // Clamp to balance
//     if (value > numericBalance) {
//       value = numericBalance;
//     }

//     setAmount(value);
//   };
//   type PayoutMethod =
//   | {
//       id: string;
//       type: "card";
//       brand: string;
//       last4: string;
//       expMonth: number;
//       expYear: number;
//       isDefault: boolean;
//       instantEligible: boolean;
//     }
//   | {
//       id: string;
//       type: "bank";
//       bankName: string;
//       last4: string;
//       currency: string;
//       isDefault: boolean;
//       instantEligible: boolean;
//     };




//   const handleAddPaymentMethod = async () => {
//     // if (!customerId) return;

//     // Create a SetupIntent via Supabase Edge Function
//     const { data, error } = await supabase.functions.invoke("create-setup-intent");

//     if (error) {
//       alert(error.message);
//       return;
//     }
//     console.log('secret:', data.clientSecret);
//     setModalSecret(data.clientSecret);
//   };

//   const handleWithdrawal= async()=>{
//        const { data, error } = await supabase.functions.invoke("create-payout", {body:{amount:amount , destination:payoutMethod.id ,}});

//     if (error) {
//       alert(error.message);
//       return;
//     }
//     console.log('secret:', data.clientSecret);
//     setModalSecret(data.clientSecret);
//   }

  

//   return (
//     <>
//       <div className="space-y-10">
//           <div className="space-y-2">
//             <Input
//               id="amount"
//               name="amount"
//               type="number"
//               value={amount}
//               min={0}
//               max={numericBalance}
//               step="0.01"
//               onChange={handleAmountChange}
//               required
//             />

//             <div className="flex flex-row items-center justify-between text-lg ">
//               <p className="text-sm text-muted-foreground text-center">
//                 Your Available Balance
//               </p>
//               ${balance}
//             </div>
//           </div>
//           <div>
//             {normalizedMethods.length === 0 ? (
//               <p className="text-sm text-muted-foreground text-center">
//                 You haven’t added a payout method yet.
//               </p>
//             ) : (
//               normalizedMethods.map((m) => (
//                 <PayoutMethodRow
//                   key={m.id}
//                   method={m}
//                   selected={payoutMethod?.id === m.id}
//                   onSelect={() => setPayoutMethod(m)}
//                 />
//               ))
//             )}
//             {/* {methods.length === 0 ? (
//                 <p className="text-sm text-muted-foreground text-center">
//                 You haven’t added a payment method yet.
//                 </p>
//             ) : ( methods.map((m) => { 
//                const isSelected = payoutMethod?.id === m.id;
//                 return (
//                   <div
//                     key={m.id}
//                     onClick={() => setPayoutMethod(m)}
//                     className="flex items-center justify-between p-3 border rounded-lg"
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs font-medium">
//                         {m.card.brand.toUpperCase()}
//                       </div>
//                       <div>
//                         <div className="text-sm font-medium">•••• {m.card.last4}</div>
//                         <div className="text-xs text-muted-foreground">
//                           Expires {m.card.exp_month}/{m.card.exp_year}
//                         </div>
//                       </div>
//                     </div>
//                     {isSelected && <Badge>Selected</Badge>}
//                     {m.is_default && <Badge variant="secondary">Default</Badge>}
//                   </div>
//                 )
//               }
//           ))} */}


//           <Button variant="outline" className="w-full" onClick={handleAddPaymentMethod}>
//           Add Payment Method
//           </Button>
//           {/* {role==='driver'?
//           <PayoutAccountCollectionButton
//             clientSecret={modalSecret}
//             name={name}
//             email={email}/>:
//             <Button variant="outline" className="w-full" onClick={handleAddPaymentMethod}>
//             Add Payment Method
//           </Button>} */}
//         </div>

//         {payoutMethod &&( <Button
//             className="w-full mt-4"
//             disabled={!amount || amount <= 0}
//             onClick={() => handleWithdrawal()}
//           >
//             Withdraw ${amount}
//           </Button>)}
//       </div>



//       {modalSecret && (
//          <ResponsivePaymentModal
//           isOpen={!!modalSecret}
//           onClose={() => setModalSecret(null)}
//           title="Add Payout Method"
//           clientSecret={modalSecret}
//         >
//           <SetupIntentModal role={role} clientSecret={modalSecret}/>
//         </ResponsivePaymentModal>
//         )
//       }

//     </>
//   );
// }
