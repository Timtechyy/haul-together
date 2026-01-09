import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hmac-signature",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERIFF_SHARED_SECRET = Deno.env.get("VERIFF_SHARED_SECRET");
    if (!VERIFF_SHARED_SECRET) {
      throw new Error("Veriff shared secret not configured");
    }
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Verify webhook signature
    const signature = req.headers.get("x-hmac-signature");
    const rawBody = await req.arrayBuffer();
    const bodyBytes = new Uint8Array(rawBody);

    if (signature) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(VERIFF_SHARED_SECRET);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ]);
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, bodyBytes);
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const webhookData = JSON.parse(new TextDecoder().decode(bodyBytes));
    console.log("Veriff webhook received:", webhookData);

    const { sessionId, vendorData, acceptanceTime, time, data, } = webhookData;

    if (!data) {
      throw new Error("No verification data in webhook");
    }

    const sessionID = sessionId;
    const status = data.verification.decision;
    const userId = vendorData; // This is the user_id we sent
    const verifiedAt = acceptanceTime;
    const submitedAt = time;

    // Map Veriff status to our internal status
    let verificationStatus = "pending";
    if (status === "approved") {
      verificationStatus = "approved";
    } else if (status === "declined") {
      verificationStatus = "rejected";
    } else if (status === "resubmission_requested") {
      verificationStatus = "resubmit";
    }

    // Update driver verification status
    const { error } = await supabase
      .from("driver_verifications")
      .upsert({
        veriff_session_id: sessionID,
        user_id: userId,
        verification_status: verificationStatus,
        verified_at: verifiedAt,
        submitted_at: submitedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating driver verification:", error);
      throw error;
    }

    console.log(`Updated verification status to ${verificationStatus} for session ${sessionId} of ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        sessionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in veriff-webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});



