import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, } = await supabaseClient.auth.getUser(token);


    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const{amount, destination, } = await req.json();
    


    const payout = await stripe.payouts.create(
      {
        amount: amount * 100,
        currency: 'usd',
        destination: destination,
        // expand: ['12345'],
        method: 'instant',
        // payout_method: 'wert',
        // source_type: 'bank_account',
        // statement_descriptor: 'wehauler',
        // description: '234567',
      },
    );

    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }

});