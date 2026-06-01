import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multi-currency expected amounts (major units) for vendor registration
const REGISTRATION_PRICES: Record<string, number> = {
  NGN: 1200,
  GHS: 12,
  KES: 100,
  ZAR: 15,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

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
      .select("id, is_approved")
      .eq("id", vendor_id)
      .single();

    if (existing?.is_approved) {
      return new Response(JSON.stringify({ success: true, message: "Already approved" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Validate currency + amount against expected
    const currency = (paystackData.data.currency || "NGN").toUpperCase();
    const amountSubunits = Number(paystackData.data.amount || 0);
    const expectedMajor = REGISTRATION_PRICES[currency];

    if (!expectedMajor) {
      return new Response(JSON.stringify({ error: `Unsupported currency: ${currency}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Allow small rounding tolerance (1 subunit)
    if (amountSubunits < expectedMajor * 100 - 1) {
      return new Response(JSON.stringify({ error: "Insufficient payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("vendors")
      .update({ is_approved: true, payment_status: "paid", payment_reference: reference })
      .eq("id", vendor_id);
    if (updateError) throw updateError;

    await supabase.from("vendor_notifications").insert({
      vendor_id,
      type: "approval",
      title: "✅ Account Activated!",
      message: "Your registration payment was confirmed and your account is now live.",
      is_read: false,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and vendor approved" }),
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
