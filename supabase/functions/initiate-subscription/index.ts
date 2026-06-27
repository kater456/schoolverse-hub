import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { vendor_id, plan } = await req.json();

    // Validate plan
    if (!["standard", "pro"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get vendor + user email
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, user_id, business_name, subscription_plan, subscription_status")
      .eq("id", vendor_id)
      .single();

    if (vendorError || !vendor) {
      return new Response(
        JSON.stringify({ error: "Vendor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", vendor.user_id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: "Vendor email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve plan code
    const planCode = plan === "pro"
      ? Deno.env.get("PAYSTACK_PRO_PLAN_CODE")
      : Deno.env.get("PAYSTACK_STANDARD_PLAN_CODE");

    // Return config for frontend Paystack inline popup
    return new Response(
      JSON.stringify({
        email: profile.email,
        plan_code: planCode,
        plan_name: plan,
        amount: plan === "pro" ? 350000 : 150000, // in kobo
        vendor_id: vendor.id,
        public_key: Deno.env.get("PAYSTACK_PUBLIC_KEY"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
