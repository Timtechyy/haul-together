import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
interface PlateData{
    id:string;
    state:string;
}

const initSupabase = (authHeader: string) => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
};

function validate(data:unknown): asserts data is PlateData{
    if (!data|| typeof data !=="object") {
        throw new Error("plate data is missing");
        
    }

    const p = data as Record<string, unknown>; 
     const requiredFields: (keyof PlateData)[] = [
    "id",
    "state",
  
  ];

  const missingOrInvalid = requiredFields.filter((field) => {
    const value = p[field];

    if (typeof value !== "string") return true;
    if (value.trim().length === 0) return true;

    return false;
  });

  if (missingOrInvalid.length > 0) {
    throw new Error(
      `Missing or invalid verification fields: ${missingOrInvalid.join(", ")}`
    );
  }
}

serve(async (req) => { 
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        
        const authHeader = req.headers.get("Authorization");
        
        if (!authHeader) {
            console.error("Missing authorization header");
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
        const token = authHeader.replace('Bearer ', '');
        console.log("Token extracted, length:", token.length);
        
        const supabase = initSupabase(authHeader);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError) {
            console.error("Auth error:", userError);
            return new Response(JSON.stringify({ error: "Authentication failed: " + userError.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
        
        if (!user) {
            console.error("No user found");
            return new Response(JSON.stringify({ error: "User not authenticated" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
         const { plate } = await req.json();
        validate(plate)

        const PLATES_TO_VIN_BASE_URL = Deno.env.get("PLATES_TO_VIN_BASE_URL");
        if (!PLATES_TO_VIN_BASE_URL ) throw new Error("PLATES TO VIN BASE URL not configured");

        const PLATES_TO_VIN_API_KEY = Deno.env.get("PLATES_TO_VIN_API_KEY");
        if (!PLATES_TO_VIN_API_KEY ) throw new Error("PLATES TO VIN API KEY not configured");
        const response = await fetch( PLATES_TO_VIN_BASE_URL + "/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": PLATES_TO_VIN_API_KEY,
       "Accept": "application/json"
    
    },
    body: JSON.stringify({
        state: plate.state,
        plate: plate.id
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return new Response(
      JSON.stringify({
        error: "Vehicle lookup failed",
        details: errorText,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const data = await response.json();
    

      if (!data.success) {
        return new Response(
          JSON.stringify({
            error: data.message || "Vehicle not found",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        return new Response(
          JSON.stringify({ vin: data.vin }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

 
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } } );
  }
});