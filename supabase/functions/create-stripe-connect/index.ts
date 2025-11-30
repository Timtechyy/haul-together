import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

async function uploadFile(PicturePath: File) {
  // const fp = deno.readFileSync(PicturePath);
  const buffer = Buffer.from(await PicturePath.arrayBuffer());

  const upload = await stripe.files.create({
    file: {
      data: buffer,
      name: PicturePath.name,
      type: PicturePath.type || "application.octet-stream",
    },
    purpose: "identity_document",
  });

  return upload.id;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"));

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);
    const { verification } = await req.json();

    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    const frontImageId = await uploadFile(verification.licenseFrontPath);
    const backImageId = await uploadFile(verification.licenseBackPath);
    const tokenId = await stripe.tokens.create({
      account: {
        business_type: "individual",
        individual: {
          first_name: verification.firstName,
          last_name: verification.last_name,
          phone: verification.phoneNumber,
          email: verification.email,
          gender: verification.gender,
          id_numbers: verification.licenseNumber,
          ssn_last_4: verification.ssnLastFour,
          dob: {
            day: verification.dobday,
            month: verification.dobmonth,
            year: verification.dobyear,
          },
          address: {
            city: verification.city,
            country: verification.country,
            line1: verification.line,
            postal_code: verification.postal_code,
            state: verification.state,
          },
          verification: {
            document: {
              back: backImageId.id,
              front: frontImageId.id,
            },
          },
        },
        tos_shown_and_accepted: true,
      },
    });

    const account = await stripe.accounts.create({
      country: "US",
      type: "custom",
      capabilities: {
        bank_transfer_payments: {
          requested: true,
        },
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
        us_bank_transfer_payments: {
          requested: true,
        },
      },
      controller: {
        fees: {
          payer: "application",
        },
        losses: {
          payments: "application",
        },
        stripe_dashboard: {
          type: "none",
        },
      },
      account_token: tokenId.id,
      settings: {
        payments: {
          statement_descriptor: "WEHAULER",
        },
        payouts: {
          statement_descriptor: "WEHAULER",
        },

        card_payments: {
          statement_descriptor_prefix: "WEHAULER",
        },
      },
      tos_acceptance: {
        service_agreement: "full",
      },
    });

    // Save stripe_id to the database
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ stripe_Connect_id: account.id })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with stripe_id:", updateError);
      throw new Error("Failed to save Stripe customer ID");
    }

    return new Response(JSON.stringify({ accountId: account.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-or-create-customer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
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
