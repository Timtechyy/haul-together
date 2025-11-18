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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    console.log("Checking for existing Stripe customer for user:", user.id);

    // Check if user already has a stripe_id in the database
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_id, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // If stripe_id exists, return it
    if (profile.stripe_id) {
      console.log("Found existing Stripe customer:", profile.stripe_id);
      return new Response(
        JSON.stringify({ customerId: profile.stripe_id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Creating new Stripe customer for user:", user.id);

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    console.log("Created Stripe customer:", customer.id);

    // Save stripe_id to the database
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ stripe_id: customer.id })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with stripe_id:", updateError);
      throw new Error("Failed to save Stripe customer ID");
    }

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-or-create-customer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
