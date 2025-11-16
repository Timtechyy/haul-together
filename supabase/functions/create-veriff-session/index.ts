import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";


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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("Missing authorization header");
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
    
    if (userError) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Authentication failed: " + userError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    if (!user) {
      console.error("No user found");
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    console.log("User authenticated:", user.id);

    const { verification } = await req.json();
    console.log("Creating Veriff session for user:", user.id);
    
    const veriffSession = await createVeriffSession(user.id, verification);
    console.log("Veriff session created:", veriffSession.id);

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