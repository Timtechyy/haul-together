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

    const { sessionId, imageFront, imageBack } = await req.json();
    
    const veriffApiKey = Deno.env.get("VERIFF_API_KEY");
    if (!veriffApiKey) {
      throw new Error("Veriff API key not configured");
    }

    console.log("Uploading images to Veriff session:", sessionId);

    // Helper function to convert image URL to base64
    const urlToBase64 = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return base64;
    };

    // Upload front image
    if (imageFront) {
      const base64Front = await urlToBase64(imageFront);
      
      const frontResponse = await fetch(
        `https://stationapi.veriff.com/v1/sessions/${sessionId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-CLIENT": veriffApiKey,
          },
          body: JSON.stringify({
            image: {
              context: "document-front",
              content: base64Front,
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      if (!frontResponse.ok) {
        const errorText = await frontResponse.text();
        console.error("Veriff upload error (front):", errorText);
        throw new Error(`Failed to upload front image: ${frontResponse.status}`);
      }

      console.log("Front image uploaded successfully");
    }

    // Upload back image
    if (imageBack) {
      const base64Back = await urlToBase64(imageBack);
      
      const backResponse = await fetch(
        `https://stationapi.veriff.com/v1/sessions/${sessionId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-CLIENT": veriffApiKey,
          },
          body: JSON.stringify({
            image: {
              context: "document-back",
              content: base64Back,
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      if (!backResponse.ok) {
        const errorText = await backResponse.text();
        console.error("Veriff upload error (back):", errorText);
        throw new Error(`Failed to upload back image: ${backResponse.status}`);
      }

      console.log("Back image uploaded successfully");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Images uploaded successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in upload-to-veriff:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
