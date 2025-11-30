import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async ( req: Request ) => {
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
    const { data: { user } } = await supabaseClient.auth.getUser(token);
  

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-08-27.basil",
    });

    // Create new Stripe customer
    const account = await stripe.v2.core.accounts.update({
      contact_email: user.email,
      display_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`,
      identity: {
        country: 'us',
        entity_type: 'individual',
        individual: {
          given_name: user.user_metadata?.first_name,
          surname: user.user_metadata?.last_name,
          phone: user.user_metadata?.phone,
          email: user.email,  
          legal_gender:user.user_metadata?.gender,
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true
              }
            }
          }
        }
      },
      defaults: {
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      dashboard: 'none',
      include: [
        'configuration.recipient',
        'identity',
        'defaults',
      ],
    });
    console.log("Created new Stripe customer:", account.id);

    // Save stripe_id to the database
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ stripe_id: account.id })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with stripe_id:", updateError);
      throw new Error("Failed to save Stripe customer ID");
    }

    return new Response(
      JSON.stringify({ accountId: account.id }),
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




// {
//   "requirements": {
//     "currently_due": [
//       "configuration.merchant.mcc",
//       "configuration.merchant.statement_descriptor.descriptor",
//       "defaults.profile.business_url",
//       "external_account",
//       "identity.attestations.terms_of_service.account.date",
//       "identity.attestations.terms_of_service.account.ip",
//       "identity.individual.address.city",
//       "identity.individual.address.line1",
//       "identity.individual.address.postal_code",
//       "identity.individual.address.state",
//       "identity.individual.date_of_birth.day",
//       "identity.individual.date_of_birth.month",
//       "identity.individual.date_of_birth.year",
//       "identity.individual.email",
//       "identity.individual.given_name",
//       "identity.individual.id_numbers.us_ssn_last_4",
//       "identity.individual.phone",
//       "identity.individual.surname"
//     ],
//     "eventually_due": []
//   }
// }