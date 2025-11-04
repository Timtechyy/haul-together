import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { verification } = await req.json();
    
    const veriffApiKey = Deno.env.get("VERIFF_API_KEY");
    if (!veriffApiKey) {
      throw new Error("Veriff API key not configured");
    }

    console.log("Creating Veriff session for user:", user.id);

    // Create Veriff session
    const veriffResponse = await fetch("https://stationapi.veriff.com/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-CLIENT": veriffApiKey,
      },
      body: JSON.stringify({
        verification: {
          person: {
            firstName: verification.firstName,
            lastName: verification.lastName,
            dateOfBirth: verification.dateOfBirth,
          },
          document: {
            number: verification.licenseNumber,
            type: "DRIVERS_LICENSE",
            country: "US",
          },
          vendorData: user.id,
        },
      }),
    });

    if (!veriffResponse.ok) {
      const errorText = await veriffResponse.text();
      console.error("Veriff API error:", errorText);
      throw new Error(`Veriff API error: ${veriffResponse.status}`);
    }

    const veriffData = await veriffResponse.json();
    console.log("Veriff session created:", veriffData.verification.id);

    // Update driver_verifications with session ID
    const { error: updateError } = await supabase
      .from("driver_verifications")
      .update({
        veriff_session_id: veriffData.verification.id,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating verification:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        sessionId: veriffData.verification.id,
        url: veriffData.verification.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-veriff-session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
