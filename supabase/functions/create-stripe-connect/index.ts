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
  const arrayBuffer = await PicturePath.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: PicturePath.type });

  const form = new FormData();
  form.append("purpose", "identity_document");
  form.append("file", blob, PicturePath.name);

  const response = await fetch("https://files.stripe.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
    },
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Stripe upload error:", data);
    throw new Error("Stripe file upload failed");
  }

  return data.id;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);

    const form = await req.formData();

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Get image files from form data
    const frontImage = form.get("licenseFront") as File;
    const backImage = form.get("licenseBack") as File;
    console.log(frontImage);
    console.log(backImage);

    if (!frontImage || !backImage) {
      throw new Error("License images are required");
    }

    console.log("Front:", frontImage?.name, frontImage?.size);
    console.log("Back:", backImage?.name, backImage?.size);

    console.log("ABOUT TO uploaded IMAGE Id:");
    const frontImageId = await uploadFile(frontImage);
    const backImageId = await uploadFile(backImage);

    console.log("Image uploaded Id:", frontImageId);
    console.log("back Image uploaded Id:", backImageId);

    // --- Add this logging right here ---
    const accountTokenParams = {
      business_type: "individual",
      individual: {
        first_name: form.get("firstName"),
        last_name: form.get("lastName"),
        phone: form.get("phoneNumber"),
        email: form.get("email"),
        gender: form.get("gender"),
        // Note: For US, this is often 'ssn_last_4' instead of generic 'id_numbers' in token creation
        id_number: form.get("licenseNumber"),
        ssn_last_4: form.get("ssnLastFour"),
        dob: {
          day: Number(form.get("dobday")),
          month: Number(form.get("dobmonth")),
          year: Number(form.get("dobyear")),
        },
        address: {
          city: form.get("city"),
          country: form.get("country"),
          line1: form.get("line"),
          postal_code: form.get("postal_code"),
          state: form.get("state"),
        },
        verification: {
          document: {
            back: backImageId,
            front: frontImageId,
          },
        },
      },
      tos_shown_and_accepted: true,
    };
    console.log("Stripe Token Params:", JSON.stringify(accountTokenParams, null, 2));

    let tokenId;
    try {
      tokenId = await stripe.tokens.create({ account: accountTokenParams });
      console.log("Token created:", tokenId.id);
    } catch (err) {
      console.error("Stripe token creation failed:", err);
      throw err;
    }

    // const tokenId = await stripe.tokens.create({
    //   account: {
    //     business_type: "individual",
    //     individual: {
    //       first_name: form.get("firstName"),
    //       last_name: form.get("lastName"),
    //       phone: form.get("phoneNumber"),
    //       email: form.get("email"),
    //       gender: form.get("gender"),
    //       dob: {
    //         day: Number(form.get("dobday")),
    //         month: Number(form.get("dobmonth")),
    //         year: Number(form.get("dobyear")),
    //       },
    //       address: {
    //         city: form.get("city"),
    //         country: form.get("country"),
    //         line1: form.get("line"),
    //         postal_code: form.get("postal_code"),
    //         state: form.get("state"),
    //       },
    //       verification: {
    //         document: {
    //           back: backImageId,
    //           front: frontImageId,
    //         },
    //       },
    //     },
    //     tos_shown_and_accepted: true,
    //   },
    // });

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

    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in creating connect account:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// }
