import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
      if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) return new Response("Unauthorized", { status: 401 });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: "2025-08-27.basil",});


    const { data: profile, error:profileError } = await supabase
      .from("profiles")
      .select("stripe_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    const stripeId = profile?.stripe_id;
        
    const types = ["card", "us_bank_account"];
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeId,
      type: types,
    });

    return new Response(JSON.stringify({ methods: paymentMethods.data }), {
      headers: {...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
