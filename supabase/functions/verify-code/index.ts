import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, code } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Look up matching, non-expired, non-consumed row
    const { data: matchedRow, error: dbErr } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", cleanCode)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbErr) {
      console.error("Verification code DB error:", dbErr);
      throw new Error("Failed to look up verification code");
    }

    if (!matchedRow) {
      return new Response(JSON.stringify({ error: "Invalid or expired verification code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark the code as consumed
    const { error: consumeErr } = await supabase
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", matchedRow.id);

    if (consumeErr) {
      console.error("DB Update consume error:", consumeErr);
      throw new Error("Failed to consume verification code");
    }

    // Call Supabase Admin API to mark the user as email confirmed
    const { error: confirmErr } = await supabase.auth.admin.updateUserById(
      matchedRow.user_id,
      { email_confirm: true }
    );

    if (confirmErr) {
      console.error("Auth update user email_confirm error:", confirmErr);
      throw new Error("Failed to update user verification status in auth system");
    }

    // Also, let's run a quick non-blocking cleanup of expired codes
    try {
      await supabase
        .from("email_verification_codes")
        .delete()
        .lt("expires_at", new Date().toISOString());
    } catch (cleanupErr) {
      console.warn("Expired codes cleanup failed (ignoring):", cleanupErr);
    }

    return new Response(JSON.stringify({ success: true, message: "Email verified successfully" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("verify-code error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
