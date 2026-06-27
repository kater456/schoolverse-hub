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
    const { vendor_id } = await req.json();

    if (!vendor_id) {
      return new Response(
        JSON.stringify({ error: "Missing vendor_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get vendor subscription details ───────────────────────────────
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, subscription_code, email_token, subscription_plan, subscription_expires")
      .eq("id", vendor_id)
      .single();

    if (vendorError || !vendor) {
      return new Response(
        JSON.stringify({ error: "Vendor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vendor.subscription_code) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Call Paystack to disable the subscription ─────────────────────
    const paystackRes = await fetch(
      "https://api.paystack.co/subscription/disable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: vendor.subscription_code,
          token: vendor.email_token,
        }),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ error: "Failed to cancel with Paystack", details: paystackData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Mark as cancelled locally ─────────────────────────────────────
    // IMPORTANT: We do NOT remove access immediately
    // Vendor keeps access until subscription_expires date
    await supabase
      .from("vendors")
      .update({ subscription_status: "cancelled" })
      .eq("id", vendor_id);

    // ── Log the cancellation ──────────────────────────────────────────
    await supabase.from("subscription_events").insert({
      vendor_id,
      event_type: "subscription.cancelled",
      subscription_code: vendor.subscription_code,
      plan: vendor.subscription_plan,
      raw_payload: paystackData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription cancelled. Access continues until end of billing period.",
        access_until: vendor.subscription_expires,
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
