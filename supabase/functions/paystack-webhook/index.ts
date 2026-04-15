import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

// ── Featured listing payment ──────────────────────────────────────────────────
async function handleFeaturedPayment(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;
  const plan = data.metadata?.plan ?? "top_listing";

  if (!vendorId) {
    console.error("paystack-webhook: no vendor_id for featured", data.reference);
    return;
  }

  // Idempotency
  const { data: existing } = await supabase
    .from("featured_listings").select("id")
    .eq("payment_reference", data.reference).maybeSingle();
  if (existing) return;

  const minAmount = plan === "top_listing_reels" ? 200000 : 100000;
  if (data.amount < minAmount) return;

  const now    = new Date();
  const endsAt = new Date(now.getTime() + 7 * 86_400_000);

  const { error: insertError } = await supabase.from("featured_listings").insert({
    vendor_id: vendorId,
    payment_reference: data.reference,
    payment_status: "confirmed",
    amount: data.amount / 100,
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    plan,
  });
  if (insertError) throw insertError;

  const updates: any = { promoted_until: endsAt.toISOString() };
  if (plan === "top_listing_reels") updates.reels_enabled = true;

  const { error: updateError } = await supabase.from("vendors")
    .update(updates).eq("id", vendorId);
  if (updateError) throw updateError;

  console.log("paystack-webhook: featured activated", vendorId);
}

// ── Vendor registration payment ───────────────────────────────────────────────
async function handleRegistrationPayment(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) { console.error("paystack-webhook: no vendor_id for registration", data.reference); return; }

  const { data: vendor } = await supabase.from("vendors").select("id, is_approved").eq("id", vendorId).single();
  if (!vendor || vendor.is_approved) return;

  if (data.amount < 120000) { console.warn("paystack-webhook: insufficient registration amount", data.amount); return; }

  const { error } = await supabase.from("vendors")
    .update({ is_approved: true, payment_status: "paid" }).eq("id", vendorId);
  if (error) throw error;

  await supabase.from("vendor_notifications").insert({
    vendor_id: vendorId, type: "approval",
    title: "✅ Account Activated!",
    message: "Your registration payment was confirmed and your account is now live.",
    is_read: false,
  });

  console.log("paystack-webhook: vendor approved", vendorId);
}

// ── Verified badge payment ────────────────────────────────────────────────────
async function handleVerificationPayment(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) { console.error("paystack-webhook: no vendor_id for verification", data.reference); return; }
  if (data.amount < 200000) return;

  const { error } = await supabase.from("vendors").update({
    is_verified: true,
    verification_payment_ref: data.reference,
    verification_applied_at: new Date().toISOString(),
  }).eq("id", vendorId);
  if (error) throw error;

  console.log("paystack-webhook: vendor verified", vendorId);
}

// ── Store upgrade payment ─────────────────────────────────────────────────────
async function handleStoreUpgrade(supabase: any, data: any) {
  const vendorId = data.metadata?.vendor_id
    ?? data.metadata?.custom_fields?.find((f: any) => f.variable_name === "vendor_id")?.value;

  if (!vendorId) { console.error("paystack-webhook: no vendor_id for store upgrade", data.reference); return; }
  if (data.amount < 150000) return;

  const { data: existing } = await supabase.from("vendor_store_upgrades")
    .select("id").eq("payment_reference", data.reference).maybeSingle();
  if (existing) return;

  const now    = new Date();
  const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: insertError } = await supabase.from("vendor_store_upgrades").insert({
    vendor_id: vendorId, payment_reference: data.reference,
    payment_status: "confirmed", amount: 1500,
    starts_at: now.toISOString(), ends_at: endsAt.toISOString(),
  });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase.from("vendors").update({
    is_store_upgraded: true, store_upgrade_expires_at: endsAt.toISOString(),
  }).eq("id", vendorId);
  if (updateError) throw updateError;

  console.log("paystack-webhook: store upgraded", vendorId);
}

// ── Route by reference prefix ─────────────────────────────────────────────────
async function routeByReference(supabase: any, data: any) {
  const ref: string = data.reference ?? "";

  if (ref.startsWith("vr_"))            await handleRegistrationPayment(supabase, data);
  else if (ref.startsWith("verif_"))    await handleVerificationPayment(supabase, data);
  else if (ref.startsWith("feat_"))     await handleFeaturedPayment(supabase, data);
  else if (ref.startsWith("store_upgrade_")) await handleStoreUpgrade(supabase, data);
  else {
    // Fallback: metadata-based routing
    const type = data.metadata?.payment_type;
    if      (type === "registration")  await handleRegistrationPayment(supabase, data);
    else if (type === "verification")  await handleVerificationPayment(supabase, data);
    else if (type === "featured")      await handleFeaturedPayment(supabase, data);
    else if (type === "store_upgrade") await handleStoreUpgrade(supabase, data);
    else console.warn("paystack-webhook: unknown reference prefix", ref);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const rawBody = await req.text();

    const signature = req.headers.get("x-paystack-signature") ?? "";
    if (signature && !verifySignature(rawBody, signature, PAYSTACK_SECRET_KEY)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    console.log("paystack-webhook event:", event.event);

    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await routeByReference(supabase, event.data);

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("paystack-webhook error:", message);
    return new Response(JSON.stringify({ received: true, error: message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
