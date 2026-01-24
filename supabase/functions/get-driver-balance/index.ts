// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
        const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const {
        data: { user },
        } = await supabaseClient.auth.getUser(token);

        if (!user) throw new Error("User not authenticated");

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2025-08-27.basil",
        });

           const { id } = await req.json();

        const balance = await stripe.balance.retrieve({
            stripeAccount:id,
        });

        return new Response(JSON.stringify({ balance }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });


    } catch(e:any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});