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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { reference, vendor_id, plan } = await req.json();
    if (!reference || !vendor_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing reference, vendor_id or plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if already processed
    const { data: existing } = await supabase
      .from("featured_listings")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with Paystack
    const res  = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const data = await res.json();

    if (!res.ok || !data.status || data.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment not verified", details: data.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount     = data.data.amount; // kobo
    const minAmount  = plan === "top_listing_reels" ? 200000 : 100000;
    if (amount < minAmount) {
      return new Response(JSON.stringify({ error: "Insufficient payment amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now    = new Date();
    const endsAt = new Date(now.getTime() + 7 * 86_400_000); // 7 days
    const reels  = plan === "top_listing_reels";

    // Insert featured listing record
    const { error: insertError } = await supabase.from("featured_listings").insert({
      vendor_id,
      payment_reference: reference,
      payment_status: "confirmed",
      amount: amount / 100, // convert kobo to naira
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      plan,
    } as any);
    if (insertError) throw insertError;

    // Update vendor: set promoted_until and optionally enable reels
    const updates: any = { promoted_until: endsAt.toISOString() };
    if (reels) updates.reels_enabled = true;

    const { error: updateError } = await supabase.from("vendors")
      .update(updates)
      .eq("id", vendor_id);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success:  true,
        message:  `Featured listing activated until ${endsAt.toLocaleDateString("en-GB")}`,
        ends_at:  endsAt.toISOString(),
        reels_enabled: reels,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
