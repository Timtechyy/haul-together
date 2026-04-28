import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const initSupabase = (authHeader: string) => {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = initSupabase(authHeader);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { sessionId, imageBase64, mimeType, imageType } = await req.json();

    if (!sessionId || !imageBase64 || !imageType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const VERIFF_BASE_URL = Deno.env.get("VERIFF_BASE_URL");
    const VERIFF_API_KEY = Deno.env.get("VERIFF_API_KEY");
    const VERIFF_SHARED_SECRET = Deno.env.get("VERIFF_SHARED_SECRET");

    if (!VERIFF_BASE_URL || !VERIFF_API_KEY || !VERIFF_SHARED_SECRET) {
      throw new Error("Veriff credentials missing");
    }

    const content = `data:${mimeType};base64,${imageBase64}`;
    const payload = {
      image: {
        context: imageType,
        content,
        timestamp: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(VERIFF_SHARED_SECRET);
    const messageData = encoder.encode(payloadString);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // console.log(`Uploading ${imageType} to session ${sessionId}`);
    const response = await fetch(`${VERIFF_BASE_URL}/sessions/${sessionId}/media`, {
      method: "POST",
      headers: {
        "x-auth-client": VERIFF_API_KEY,
        "x-hmac-signature": signature,
        "Content-Type": "application/json",
      },
      body: payloadString,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload ${imageType}: ${text}`);
    }

    // console.log(`Successfully uploaded ${imageType}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in upload-veriff-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
