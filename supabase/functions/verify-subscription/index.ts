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
    const { reference, vendor_id, plan } = await req.json();

    if (!reference || !vendor_id || !plan) {
      return new Response(
        JSON.stringify({ error: "Missing reference, vendor_id or plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Authenticate caller & verify they own this vendor ─────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: userData } = token
      ? await supabase.auth.getUser(token)
      : ({ data: { user: null } } as any);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: ownerRow } = await supabase
      .from("vendors").select("user_id").eq("id", vendor_id).single();
    if (!ownerRow || ownerRow.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotency: skip if this reference was already processed ─────
    const { data: existingEvent } = await supabase
      .from("subscription_events")
      .select("id")
      .eq("paystack_ref", reference)
      .in("event_type", ["charge.success", "subscription.create", "subscription.verify.success"])
      .maybeSingle();

    if (existingEvent) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", idempotent: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ── Verify the transaction with Paystack ──────────────────────────
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment verification failed", details: paystackData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData = paystackData.data;
    const subscriptionCode = txData?.subscription?.subscription_code || null;
    const emailToken = txData?.subscription?.email_token || null;

    // ── Verify amount matches expected plan price ─────────────────────
    const expectedAmount = plan === "pro" ? 350000 : 150000; // kobo
    if (txData.amount < expectedAmount) {
      return new Response(
        JSON.stringify({ error: "Payment amount does not match plan price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Activate subscription on vendor record ────────────────────────
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        subscription_plan: plan,
        subscription_code: subscriptionCode,
        subscription_status: "active",
        subscription_start: now.toISOString(),
        subscription_expires: expiresAt.toISOString(),
        email_token: emailToken,
        // Carry forward legacy fields so nothing breaks
        is_store_upgraded: plan === "pro" ? true : false,
        store_upgrade_expires_at: plan === "pro" ? expiresAt.toISOString() : null,
      })
      .eq("id", vendor_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to activate subscription", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Log the event ─────────────────────────────────────────────────
    await supabase.from("subscription_events").insert({
      vendor_id,
      event_type: "subscription.verify.success",
      paystack_ref: reference,
      subscription_code: subscriptionCode,
      plan,
      amount_ngn: txData.amount / 100,
      raw_payload: paystackData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        plan,
        subscription_code: subscriptionCode,
        expires_at: expiresAt.toISOString(),
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
