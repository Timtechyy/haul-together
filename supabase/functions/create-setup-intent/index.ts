// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req: Request) => {
     if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
      const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY")
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const { data: { user } } = await supabaseClient.auth.getUser(token);

      if (!user) throw new Error("User not authenticated");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
    });
    // 1. Check if user already has a Stripe customer ID
    
    let { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_id;

    const { data: role } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();


    // 2. If no customer, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`,
        metadata: { supabase_uid: user.id },
      });

      customerId = customer.id;

      await supabaseClient
        .from("profiles")
        .update({ stripe_id: customerId })
        .eq("id", user.id);
    }

    // 3. Create SetupIntent for saving new cards
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: role === 'driver'?["us_bank_account"]: ["card"],
      flow_directions: role === 'driver'? ["outbound"]:[""]
     
    });

    return new Response(JSON.stringify({ clientSecret: setupIntent.client_secret }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in create-setup-intent:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
