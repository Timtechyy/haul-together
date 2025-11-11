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

    const { verification, licenseFrontBase64, licenseBackBase64 } = await req.json();
    
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

    // Upload images to storage if provided
    let licenseFrontUrl = null;
    let licenseBackUrl = null;

    if (licenseFrontBase64) {
      const frontBuffer = Uint8Array.from(atob(licenseFrontBase64.split(',')[1]), c => c.charCodeAt(0));
      const frontExt = licenseFrontBase64.split(';')[0].split('/')[1];
      const frontFileName = `${user.id}/license_front_${Date.now()}.${frontExt}`;
      
      const { error: frontUploadError } = await supabase.storage
        .from('avatars')
        .upload(frontFileName, frontBuffer, { contentType: `image/${frontExt}` });

      if (!frontUploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(frontFileName);
        licenseFrontUrl = publicUrl;
      }
    }

    if (licenseBackBase64) {
      const backBuffer = Uint8Array.from(atob(licenseBackBase64.split(',')[1]), c => c.charCodeAt(0));
      const backExt = licenseBackBase64.split(';')[0].split('/')[1];
      const backFileName = `${user.id}/license_back_${Date.now()}.${backExt}`;
      
      const { error: backUploadError } = await supabase.storage
        .from('avatars')
        .upload(backFileName, backBuffer, { contentType: `image/${backExt}` });

      if (!backUploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(backFileName);
        licenseBackUrl = publicUrl;
      }
    }

    // Save verification data to database
    const { error: dbError } = await supabase
      .from("driver_verifications")
      .upsert({
        user_id: user.id,
        first_name: verification.firstName,
        last_name: verification.lastName,
        date_of_birth: verification.dateOfBirth,
        ssn_last_four: verification.ssnLastFour,
        license_number: verification.licenseNumber,
        license_state: verification.licenseState,
        license_front_url: licenseFrontUrl,
        license_back_url: licenseBackUrl,
        verification_status: 'pending',
        veriff_session_id: veriffData.verification.id,
      });

    if (dbError) {
      console.error("Error saving verification:", dbError);
      throw dbError;
    }

    // Upload images to Veriff
    if (licenseFrontBase64) {
      const uploadFrontResponse = await fetch(
        `https://stationapi.veriff.com/v1/sessions/${veriffData.verification.id}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-CLIENT": veriffApiKey,
          },
          body: JSON.stringify({
            image: {
              context: "document-front",
              content: licenseFrontBase64.split(',')[1],
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      if (!uploadFrontResponse.ok) {
        console.error("Failed to upload front image to Veriff");
      }
    }

    if (licenseBackBase64) {
      const uploadBackResponse = await fetch(
        `https://stationapi.veriff.com/v1/sessions/${veriffData.verification.id}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-CLIENT": veriffApiKey,
          },
          body: JSON.stringify({
            image: {
              context: "document-back",
              content: licenseBackBase64.split(',')[1],
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      if (!uploadBackResponse.ok) {
        console.error("Failed to upload back image to Veriff");
      }
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
