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
    const secret = Deno.env.get("VERIFF_SHARED_SECRET");
    if (!secret) throw new Error("VERIFF_SHARED_SECRET missing");

    // Get raw body as bytes
    const bodyBuffer = await req.arrayBuffer();
    const bodyBytes = new Uint8Array(bodyBuffer);

    // Compute HMAC SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyBytes);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    const receivedSignature = req.headers.get("X-HMAC-SIGNATURE");

    if (!receivedSignature || receivedSignature !== expectedSignature) {
      console.error("Invalid Veriff signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    // Safe to parse JSON now
    const payload = JSON.parse(new TextDecoder().decode(bodyBytes));
    console.log("Veriff webhook payload:", payload);

    const verification = payload.verification;
    if (!verification) {
      throw new Error("Missing verification object");
    }

    const sessionId = verification.id;
    const status = verification.status;
    const userId = verification.vendorData;

    let verificationStatus = "pending";
    if (status === "approved") verificationStatus = "approved";
    if (status === "declined" || status === "resubmission_requested") {
      verificationStatus = "rejected";
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error } = await supabase
      .from("driver_verifications")
      .update({
        veriff_session_id: sessionId,
        verification_status: verificationStatus,
        verified_at: verificationStatus === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        sessionId,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("Veriff webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500, headers: corsHeaders });
  }
});
