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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data:{ user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error("User not authenticated");

    const { amount, currency = "usd", deliveryId } = await req.json();

    if (!amount || amount <= 0) throw new Error("Invalid amount");

    console.log("Processing payment for user:", user.id, "amount:", amount);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_id")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    let stripeCustomerId = profile?.stripe_id;

    // Create Stripe customer if it doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`,
        metadata: { supabase_user_id: user.id },
      });
      console.log("New Stripe customer created:", customer.id);
      stripeCustomerId = customer.id;

      // Update Supabase profile with new Stripe customer ID
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ stripe_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) throw updateError;

      console.log("Created new Stripe customer:", stripeCustomerId);
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      metadata: {
        user_id: user.id,
        delivery_id: deliveryId || "",
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log("Created payment intent:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-payment-intent:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
