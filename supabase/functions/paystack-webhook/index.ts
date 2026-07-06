import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Verify the request genuinely came from Paystack ───────────────────
async function verifyPaystackSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash === signature;
}

// ── Resolve plan code to plan name ────────────────────────────────────
function resolvePlanName(planCode: string): string {
  const standard = Deno.env.get("PAYSTACK_STANDARD_PLAN_CODE");
  const pro = Deno.env.get("PAYSTACK_PRO_PLAN_CODE");
  if (planCode === pro) return "pro";
  if (planCode === standard) return "standard";
  return "unknown";
}

// ── Find vendor by customer email via profiles ────────────────────────
async function findVendorByEmail(email: string) {
  if (!email) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.user_id) return null;

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, subscription_plan, subscription_code")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  return vendor || null;
}
// ── Find vendor by subscription code ──────────────────────────────────
async function findVendorBySubscriptionCode(code: string) {
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, subscription_plan, subscription_code")
    .eq("subscription_code", code)
    .maybeSingle();
  return vendor || null;
}

// ── Log every event for debugging ─────────────────────────────────────
async function logEvent(
  vendorId: string | null,
  eventType: string,
  payload: any,
  extra?: Record<string, any>
) {
  await supabase.from("subscription_events").insert({
    vendor_id: vendorId,
    event_type: eventType,
    paystack_ref: payload?.data?.reference || null,
    subscription_code: payload?.data?.subscription_code || null,
    plan: extra?.plan || null,
    amount_ngn: payload?.data?.amount ? payload.data.amount / 100 : null,
    raw_payload: payload,
  });
}

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // Reject anything not from Paystack
  const valid = await verifyPaystackSignature(rawBody, signature);
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const data = payload.data;

  console.log("Paystack webhook received:", event);

  // ── Track order_completed if it's a customer order ──
  if (event === "charge.success" && data?.metadata?.vendor_id && data?.metadata?.order_id) {
    // 1. Log event
    await supabase.from("vendor_events").insert({
      vendor_id: data.metadata.vendor_id,
      product_id: data.metadata.product_id || null,
      event_type: 'order_completed',
      visitor_id: data.metadata.visitor_id || 'webhook',
      session_id: data.metadata.session_id || '00000000-0000-0000-0000-000000000000',
    } as any);

    // 2. Upsert into vendor_customers via RPC
    let buyerId = data.metadata.buyer_id;
    if (!buyerId && data.customer?.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", data.customer.email)
        .maybeSingle();
      buyerId = profile?.user_id || null;
    }

    await supabase.rpc('track_vendor_customer', {
      p_vendor_id: data.metadata.vendor_id,
      p_buyer_id: buyerId || null,
      p_visitor_id: data.metadata.visitor_id || null,
      p_is_order: true,
      p_amount: (data.amount || 0) / 100, // Convert kobo to NGN
      p_is_inquiry: false,
    });
  }

  // ── charge.success ─────────────────────────────────────────────────
  // Fires on first payment AND every monthly renewal
  if (event === "charge.success") {
    const subscriptionCode = data?.subscription_code;
    const customerEmail = data?.customer?.email;
    const planCode = data?.plan?.plan_code;

    // Only handle subscription charges, not one-time payments
    if (!subscriptionCode) {
      return new Response("OK", { status: 200 });
    }

    // ── Idempotency: skip if this exact event was already processed ────
    const chargeRef = data?.reference;
    if (chargeRef) {
      const { data: existingCharge } = await supabase
        .from("subscription_events")
        .select("id")
        .eq("paystack_ref", chargeRef)
        .eq("event_type", "charge.success")
        .maybeSingle();
      if (existingCharge) {
        return new Response("OK", { status: 200 });
      }
    }

    const plan = resolvePlanName(planCode);
    const vendor = await findVendorByEmail(customerEmail);

    if (!vendor) {
      await logEvent(null, "charge.success.no_vendor", payload, { plan });
      return new Response("OK", { status: 200 });
    }

    // Extend subscription by 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from("vendors")
      .update({
        subscription_plan: plan,
        subscription_code: subscriptionCode,
        subscription_status: "active",
        subscription_expires: expiresAt.toISOString(),
      })
      .eq("id", vendor.id);

    await logEvent(vendor.id, "charge.success", payload, { plan });
    console.log(`Subscription renewed for vendor ${vendor.id} — plan: ${plan}`);

    // If it's a known payment for a specific order (not subscription), we'd track order_completed here.
    // However, this webhook currently handles subscriptions.
    // If the system handles products orders with Paystack, we should track it here too.
  }

  // ── subscription.create ────────────────────────────────────────────
  // Fires when a new subscription is first created
  else if (event === "subscription.create") {
    const subscriptionCode = data?.subscription_code;
    const emailToken = data?.email_token;
    const customerEmail = data?.customer?.email;
    const planCode = data?.plan?.plan_code;
    const plan = resolvePlanName(planCode);

    // ── Idempotency: skip if this exact subscription was already created ──
    if (subscriptionCode) {
      const { data: existingSub } = await supabase
        .from("subscription_events")
        .select("id")
        .eq("subscription_code", subscriptionCode)
        .eq("event_type", "subscription.create")
        .maybeSingle();
      if (existingSub) {
        return new Response("OK", { status: 200 });
      }
    }

    const vendor = await findVendorByEmail(customerEmail);
    if (!vendor) {
      await logEvent(null, "subscription.create.no_vendor", payload, { plan });
      return new Response("OK", { status: 200 });
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from("vendors")
      .update({
        subscription_plan: plan,
        subscription_code: subscriptionCode,
        subscription_status: "active",
        subscription_start: now.toISOString(),
        subscription_expires: expiresAt.toISOString(),
        email_token: emailToken,
      })
      .eq("id", vendor.id);

    await logEvent(vendor.id, "subscription.create", payload, { plan });
    console.log(`New subscription created for vendor ${vendor.id} — plan: ${plan}`);
  }

  // ── subscription.disable ───────────────────────────────────────────
  // Fires when subscription is cancelled or payment permanently fails
  else if (event === "subscription.disable") {
    const subscriptionCode = data?.subscription_code;
    const vendor = await findVendorBySubscriptionCode(subscriptionCode);

    if (!vendor) {
      await logEvent(null, "subscription.disable.no_vendor", payload);
      return new Response("OK", { status: 200 });
    }

    // Mark cancelled but DO NOT remove access immediately
    // Vendor keeps access until subscription_expires
    await supabase
      .from("vendors")
      .update({ subscription_status: "cancelled" })
      .eq("id", vendor.id);

    await logEvent(vendor.id, "subscription.disable", payload);
    console.log(`Subscription cancelled for vendor ${vendor.id} — access until expiry`);
  }

  // ── invoice.payment_failed ─────────────────────────────────────────
  // Fires when a renewal charge fails — Paystack will retry
  else if (event === "invoice.payment_failed") {
    const subscriptionCode = data?.subscription_code;
    const vendor = await findVendorBySubscriptionCode(subscriptionCode);

    if (!vendor) {
      await logEvent(null, "invoice.payment_failed.no_vendor", payload);
      return new Response("OK", { status: 200 });
    }

    // Log it but don't cut access — Paystack retries before disabling
    await logEvent(vendor.id, "invoice.payment_failed", payload);
    console.log(`Payment failed for vendor ${vendor.id} — Paystack will retry`);
  }

  // Always return 200 — Paystack retries if it gets anything else
  return new Response("OK", { status: 200 });
});
