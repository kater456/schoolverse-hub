import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

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

    // Idempotency: if already verified with this reference, skip
    const { data: existing } = await supabase
      .from("vendors")
      .select("id, is_verified, verification_payment_ref")
      .eq("id", vendor_id)
      .single();

    if (existing?.is_verified && existing?.verification_payment_ref === reference) {
      return new Response(JSON.stringify({ success: true, message: "Already verified" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const data = await res.json();

    if (!res.ok || !data.status || data.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment not verified", details: data.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Must be at least ₦2,000 (200,000 kobo)
    if (data.data.amount < 200000) {
      return new Response(JSON.stringify({ error: "Insufficient payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark vendor as verified automatically
    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        is_verified: true,
        verification_payment_ref: reference,
        verification_applied_at: new Date().toISOString(),
      })
      .eq("id", vendor_id);

    if (updateError) throw updateError;

    // In-app notification
    await supabase.from("vendor_notifications").insert({
      vendor_id,
      type: "verification",
      title: "✅ Verified Badge Granted!",
      message: "Your vendor profile is now verified. Your badge is live on your public store page.",
      is_read: false,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
