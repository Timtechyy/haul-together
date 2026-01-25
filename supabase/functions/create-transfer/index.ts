import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getChargeId(paymentIntendId:string, stripe:Stripe):Promise<string|null>{
  try {
    const paymentIntent = await await stripe.charges.list({
      payment_intent: paymentIntendId,
      limit: 1,
    });
    return paymentIntent.data[0]?.id as string;
  } catch (error) {
    console.error("Error retrieving charge ID:", error);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);
    const { delivery_id, destination } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { data: delivery, error } = await supabaseClient
    .from("deliveries")
    .select(`
      id,
      status,
      driver_id,
      driver_paid,
      driver_confirmed_at,
      customer_confirmed_at,
      delivered_at,
      price,
      payment_intent_id
    `)
    .eq("id", delivery_id)
    .single();

    if (error || !delivery) {
      throw new Error("Delivery not found");
    }

    if (
      delivery.status !== "delivered" ||
      !delivery.driver_confirmed_at ||
      !delivery.customer_confirmed_at ||
      !delivery.delivered_at ||
      delivery.driver_paid || !delivery.payment_intent_id
    ) {
      return new Response(
        JSON.stringify({ message: "Delivery not eligible for payout" }),
        { status: 200 }
      );
    }
    const chargeId = await getChargeId(delivery.payment_intent_id, stripe);

    const transfer = await stripe.transfers.create({
      amount: delivery.price * 100,
      currency: "usd",
      source_transaction: chargeId!,
      destination: destination,
      // transfer_group: delivery.id,
    });


       await supabaseClient
      .from("deliveries")
      .update({
        driver_paid: true,
        // driver_paid_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .eq("driver_paid", false);

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-or-create-customer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
