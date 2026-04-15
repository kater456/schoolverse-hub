/**
 * paystack-webhook/index.ts
 *
 * Handles Paystack server-to-server webhook events so payments are processed
 * automatically — even if the user closes the browser before the inline
 * callback fires.
 *
 * Deploy: supabase functions deploy paystack-webhook --no-verify-jwt
 *
 * In your Paystack dashboard → Settings → Webhooks, set the URL to:
 *   https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook
 *
 * Required Supabase secrets (set once):
 *   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx
 *   supabase secrets set PAYSTACK_WEBHOOK_SECRET=your_webhook_secret  (optional but recommended)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verify the HMAC-SHA512 signature Paystack attaches to every webhook. */
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

/** Activate a vendor (registration payment). */
async function handleRegistrationPayment(supabase: any, data: any) {
  // Extract vendor_id from metadata (set when creating the Paystack charge)
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) {
    console.error("paystack-webhook: no vendor_id in metadata", data.reference);
    return;
  }

  // Idempotency: skip if already approved
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, is_approved")
    .eq("id", vendorId)
    .single();

  if (!vendor || vendor.is_approved) return;

  // Minimum amount check: ₦1,200 = 120 000 kobo
  if (data.amount < 120000) {
    console.warn("paystack-webhook: insufficient registration amount", data.amount);
    return;
  }

  const { error } = await supabase
    .from("vendors")
    .update({ is_approved: true, payment_status: "paid" })
    .eq("id", vendorId);

  if (error) throw error;

  // Notify vendor
  await supabase.from("vendor_notifications").insert({
    vendor_id: vendorId,
    type: "approval",
    title: "✅ Account Activated!",
    message: "Your registration payment was confirmed and your account is now live.",
    is_read: false,
  });

  console.log("paystack-webhook: vendor approved", vendorId);
}

/** Grant verified badge (verification payment). */
async function handleVerificationPayment(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) {
    console.error("paystack-webhook: no vendor_id for verification", data.reference);
    return;
  }

  // Minimum: ₦2,000 = 200 000 kobo
  if (data.amount < 200000) return;

  const { error } = await supabase
    .from("vendors")
    .update({
      is_verified: true,
      verification_payment_ref: data.reference,
      verification_applied_at: new Date().toISOString(),
    })
    .eq("id", vendorId);

  if (error) throw error;
  console.log("paystack-webhook: vendor verified", vendorId);
}

/** Activate premium store upgrade. */
async function handleStoreUpgrade(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) {
    console.error("paystack-webhook: no vendor_id for store upgrade", data.reference);
    return;
  }

  // Minimum: ₦1,500 = 150 000 kobo
  if (data.amount < 150000) return;

  // Idempotency: skip if reference already recorded
  const { data: existing } = await supabase
    .from("vendor_store_upgrades")
    .select("id")
    .eq("payment_reference", data.reference)
    .maybeSingle();

  if (existing) return;

  const now = new Date();
  const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: insertError } = await supabase
    .from("vendor_store_upgrades")
    .insert({
      vendor_id: vendorId,
      payment_reference: data.reference,
      payment_status: "confirmed",
      amount: 1500,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    });

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("vendors")
    .update({
      is_store_upgraded: true,
      store_upgrade_expires_at: endsAt.toISOString(),
    })
    .eq("id", vendorId);

  if (updateError) throw updateError;

  await supabase.from("vendor_notifications").insert({
    vendor_id: vendorId,
    type: "store_upgrade",
    title: "🎉 Store Upgraded!",
    message: `Your premium store is active until ${endsAt.toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    })}.`,
    is_read: false,
  });

  console.log("paystack-webhook: store upgraded", vendorId);
}

// ── Route by reference prefix ─────────────────────────────────────────────────
async function routeByReference(supabase: any, data: any) {
  const ref: string = data.reference ?? "";

  if (ref.startsWith("vr_")) {
    await handleRegistrationPayment(supabase, data);
  } else if (ref.startsWith("verif_")) {
    await handleVerificationPayment(supabase, data);
  } else if (ref.startsWith("store_upgrade_")) {
    await handleStoreUpgrade(supabase, data);
  } else {
    // Fallback: try metadata-based routing
    const type = data.metadata?.payment_type;
    if (type === "registration") await handleRegistrationPayment(supabase, data);
    else if (type === "verification") await handleVerificationPayment(supabase, data);
    else if (type === "store_upgrade") await handleStoreUpgrade(supabase, data);
    else console.warn("paystack-webhook: unknown reference prefix", ref);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const rawBody = await req.text();

    // Verify Paystack signature (recommended — prevents spoofed webhooks)
    const signature = req.headers.get("x-paystack-signature") ?? "";
    if (signature && !verifySignature(rawBody, signature, PAYSTACK_SECRET_KEY)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    console.log("paystack-webhook event:", event.event);

    // Only handle successful charge events
    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await routeByReference(supabase, event.data);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("paystack-webhook error:", message);
    // Always return 200 to Paystack — non-200 triggers retries
    return new Response(JSON.stringify({ received: true, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
