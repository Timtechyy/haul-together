import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"));

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error("User not authenticated");

    const { paymentMethodId } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    let stripeId = profile?.stripe_id;
    let stripeConncectId = profile?.stripe_connected_account_id;
    // Create Payment Intent
    const tokenId = await stripe.tokens.create(
      {
        bank_account: {
          payment_method: paymentMethodId,
        },
        customer: stripeId,
      },
      {
        stripeAccount: stripeConncectId!,
      },
    );

    console.log("Created payment intent:", token.id);
    const account = await stripe.accounts.update(
      stripeConncectId!,
      {
        external_account: tokenId.id,
      },
      {
        stripeAccount: stripeConncectId!,
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in create-payment-intent:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
