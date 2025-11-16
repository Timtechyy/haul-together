import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client helper
const initSupabase = (authHeader: string) => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
};

// Upload a document image (front or back)
async function uploadVeriffImage(sessionId: string, base64Image: string, mimeType: string, imageType: "document-front" | "document-back") {
  const VERIFF_BASE_URL = Deno.env.get("VERIFF_BASE_URL");
  const VERIFF_API_KEY = Deno.env.get("VERIFF_API_KEY");
  const VERIFF_SHARED_SECRET = Deno.env.get("VERIFF_SHARED_SECRET");

  if (!VERIFF_BASE_URL || !VERIFF_API_KEY || !VERIFF_SHARED_SECRET) throw new Error("Veriff credentials missing");

  const content = `data:${mimeType};base64,${base64Image}`;

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
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  console.log(`Uploading ${imageType} to session ${sessionId}`);
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

  console.log(`Successfully uploaded ${imageType}`);
  return await response.json();
}

// Submit the Veriff session for review
async function submitVeriffSession(sessionId: string) {
  const VERIFF_BASE_URL = Deno.env.get("VERIFF_BASE_URL");
  const VERIFF_API_KEY = Deno.env.get("VERIFF_API_KEY");
  const VERIFF_SHARED_SECRET = Deno.env.get("VERIFF_SHARED_SECRET");
  
  if (!VERIFF_BASE_URL || !VERIFF_API_KEY || !VERIFF_SHARED_SECRET) throw new Error("Veriff credentials missing");
  
  const payload = {
    verification: {
      status: "submitted",
    },
  };
  
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(VERIFF_SHARED_SECRET);
  const messageData = encoder.encode(payloadString);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  console.log(`Submitting session ${sessionId} for review`);
  const response = await fetch(`${VERIFF_BASE_URL}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-auth-client": VERIFF_API_KEY,
      "x-hmac-signature": signature,
    },
    body: payloadString,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Veriff submit session error: ${text}`);
  }

  console.log(`Session ${sessionId} submitted successfully`);
  return await response.json();
}

// Main edge function
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
  // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    console.log("Token extracted, length:", token.length);
    const supabase = initSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { sessionId, licenseFrontBase64, licenseBackBase64 } = await req.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Completing verification for session ${sessionId}`);

    // Upload images if provided
    if (licenseFrontBase64) {
      await uploadVeriffImage(sessionId, licenseFrontBase64.base64, licenseFrontBase64.mimeType, "document-front");
    }
    
    if (licenseBackBase64) {
      await uploadVeriffImage(sessionId, licenseBackBase64.base64, licenseBackBase64.mimeType, "document-back");
    }

    // Submit session for review
    await submitVeriffSession(sessionId);

    return new Response(JSON.stringify({
      success: true,
      sessionId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in complete-veriff-session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
