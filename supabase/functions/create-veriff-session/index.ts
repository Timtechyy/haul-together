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


// Create a Veriff session
async function createVeriffSession(userId: string, verification: any) {
  const VERIFF_BASE_URL = Deno.env.get("VERIFF_BASE_URL");
  if (!VERIFF_BASE_URL) throw new Error("Veriff base URL not configured");
  const VERIFF_API_KEY = Deno.env.get("VERIFF_API_KEY");
  if (!VERIFF_API_KEY) throw new Error("Veriff API key not configured");
  
  const response = await fetch( VERIFF_BASE_URL + "/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-client": VERIFF_API_KEY
    },
    body: JSON.stringify({
      verification: {
        person: {
          firstName: verification.firstName,
          lastName: verification.lastName,
          dateOfBirth: verification.dateOfBirth,
          phoneNumber: verification.phoneNumber,
          idNumber: verification.licenseNumber,
          gender: verification.gender,
          email: verification.email,
        },
        document: {
          number: verification.licenseNumber,
          type: "DRIVERS_LICENSE",
          country: "US",
        },
        vendorData: userId,
        consents: [
              {
                "type": "ine",
                "approved": true,
              },
            ],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veriff API error: ${errorText}`);
  }

  const data = await response.json();
  return data.verification;
}

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
    throw new Error(`Failed to upload media: ${text}`);
  }

  return await response.json();
}

// Submit the Veriff session for review
export async function submitVeriffSession(sessionId: string) {
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

  return await response.json();
}

// Main edge function
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = initSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { verification, licenseFrontBase64, licenseBackBase64,} = await req.json()
    const veriffSession = await createVeriffSession(user.id, verification);
    if (licenseFrontBase64) await uploadVeriffImage(veriffSession.id, licenseFrontBase64.base64, licenseFrontBase64.mimeType,"document-front");
    if (licenseBackBase64) await uploadVeriffImage(veriffSession.id, licenseBackBase64.base64,licenseBackBase64.mimeType, "document-back");
    await submitVeriffSession(veriffSession.id);

    return new Response(JSON.stringify({
      sessionId: veriffSession.id,
      url: veriffSession.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-veriff-session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});