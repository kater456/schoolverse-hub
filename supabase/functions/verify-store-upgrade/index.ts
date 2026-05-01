import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { reference, vendor_id } = await req.json();

    if (!reference || !vendor_id) {
      return new Response(JSON.stringify({ error: "Missing reference or vendor_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if this reference was already processed, return existing result
    const { data: existing } = await supabase
      .from("vendor_store_upgrades")
      .select("id, ends_at")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", ends_at: existing.ends_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify payment with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment not verified", details: paystackData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify amount is at least ₦2,000 (200,000 kobo)
    const amountInKobo = paystackData.data.amount;
    if (amountInKobo < 200000) {
      return new Response(JSON.stringify({ error: "Insufficient payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create store upgrade record
    const { error: insertError } = await supabase
      .from("vendor_store_upgrades")
      .insert({
        vendor_id,
        payment_reference: reference,
        payment_status: "confirmed",
        amount: 2000,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      });

    if (insertError) throw insertError;

    // Update vendor record
    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        is_store_upgraded: true,
        store_upgrade_expires_at: endsAt.toISOString(),
      })
      .eq("id", vendor_id);

    if (updateError) throw updateError;

    // In-app notification
    await supabase.from("vendor_notifications").insert({
      vendor_id,
      type: "store_upgrade",
      title: "🎉 Store Upgraded!",
      message: `Your premium store is now active until ${endsAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`,
      is_read: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Store upgraded successfully",
        ends_at: endsAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
