import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.190.0/hash/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hmac-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERIFF_SHARED_SECRET = Deno.env.get("VERIFF_SHARED_SECRET");
    if (!VERIFF_SHARED_SECRET) {
      throw new Error("Veriff shared secret not configured");
    }

    // Verify webhook signature
    const signature = req.headers.get("x-hmac-signature");
    const payload = await req.text();
    
    if (signature) {
      const expectedSignature = createHmac("sha256", VERIFF_SHARED_SECRET)
        .update(payload)
        .toString("hex");
      
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const webhookData = JSON.parse(payload);
    console.log("Veriff webhook received:", webhookData);

    const { verification } = webhookData;
    
    if (!verification) {
      throw new Error("No verification data in webhook");
    }

    const sessionId = verification.id;
    const status = verification.status;
    const vendorData = verification.vendorData; // This is the user_id we sent

    // Map Veriff status to our internal status
    let verificationStatus = "pending";
    if (status === "approved") {
      verificationStatus = "approved";
    } else if (status === "declined" || status === "resubmission_requested") {
      verificationStatus = "rejected";
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update driver verification status
    const { data, error } = await supabase
      .from("driver_verifications")
      .update({
        verification_status: verificationStatus,
        verified_at: verificationStatus === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("veriff_session_id", sessionId);

    if (error) {
      console.error("Error updating driver verification:", error);
      throw error;
    }

    console.log(`Updated verification status to ${verificationStatus} for session ${sessionId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: verificationStatus,
        sessionId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in veriff-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
