import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFICATION_PRICES: Record<string, number> = {
  NGN: 1500,
  GHS: 15,
  KES: 130,
  ZAR: 18,
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

    // ── Authenticate caller & verify they own this vendor ─────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: userData } = token ? await supabase.auth.getUser(token) : { data: { user: null } } as any;
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

    const currency = (data.data.currency || "NGN").toUpperCase();
    const amountSubunits = Number(data.data.amount || 0);
    const expectedMajor = VERIFICATION_PRICES[currency];

    if (!expectedMajor) {
      return new Response(JSON.stringify({ error: `Unsupported currency: ${currency}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (amountSubunits < expectedMajor * 100 - 1) {
      return new Response(JSON.stringify({ error: "Insufficient payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        is_verified: true,
        verification_payment_ref: reference,
        verification_applied_at: new Date().toISOString(),
      })
      .eq("id", vendor_id);
    if (updateError) throw updateError;

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
