import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL    = "akasekater@campusmarketapp.com";
const STRIKE_LIMIT   = 5;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { vendor_id, reporter_id, reason, details, evidence_url } = await req.json();

    if (!vendor_id || !reason) {
      return new Response(JSON.stringify({ error: "Missing vendor_id or reason" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check if this user already reported this vendor (prevent spam)
    if (reporter_id) {
      const { data: existing } = await supabase
        .from("vendor_reports")
        .select("id")
        .eq("vendor_id", vendor_id)
        .eq("reporter_id", reporter_id)
        .eq("status", "pending")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: "You have already reported this vendor. Admins will review it shortly." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Insert the report
    const { error: reportError } = await supabase.from("vendor_reports").insert({
      vendor_id,
      reporter_id: reporter_id || null,
      reason,
      details: details || null,
      evidence_url: evidence_url || null,
      status: "pending",
    });

    if (reportError) throw reportError;

    // 3. Increment strike count on vendor
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, business_name, strike_count, is_suspended, schools(name)")
      .eq("id", vendor_id)
      .single();

    if (vendorError || !vendor) throw new Error("Vendor not found");

    const newStrikeCount = (vendor.strike_count || 0) + 1;
    const shouldSuspend  = newStrikeCount >= STRIKE_LIMIT;

    await supabase.from("vendors").update({
      strike_count: newStrikeCount,
      ...(shouldSuspend ? { is_suspended: true, is_approved: false } : {}),
    }).eq("id", vendor_id);

    // 4. Log in admin activity
    await supabase.from("admin_activity_log").insert({
      admin_id: reporter_id || "00000000-0000-0000-0000-000000000000",
      action: `Vendor reported: ${reason}`,
      target_type: "vendor",
      target_id: vendor_id,
      details: { reason, details, strike: newStrikeCount, auto_suspended: shouldSuspend },
    } as any);

    // 5. Send email notification to admin via Resend
    if (RESEND_API_KEY) {
      const subject = shouldSuspend
        ? `🚨 VENDOR AUTO-SUSPENDED — ${vendor.business_name} (${newStrikeCount} strikes)`
        : `⚠️ Vendor Report #${newStrikeCount} — ${vendor.business_name}`;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${shouldSuspend ? "#fee2e2" : "#fef3c7"}; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="margin: 0; color: ${shouldSuspend ? "#991b1b" : "#92400e"};">
              ${shouldSuspend ? "🚨 Vendor Auto-Suspended" : "⚠️ New Vendor Report"}
            </h2>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 16px; font-weight: 600; width: 40%;">Vendor</td>
              <td style="padding: 10px 16px;">${vendor.business_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; font-weight: 600;">School</td>
              <td style="padding: 10px 16px;">${(vendor.schools as any)?.name || "—"}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 16px; font-weight: 600;">Reason</td>
              <td style="padding: 10px 16px;">${reason}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; font-weight: 600;">Details</td>
              <td style="padding: 10px 16px;">${details || "No details provided"}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 16px; font-weight: 600;">Strike Count</td>
              <td style="padding: 10px 16px;">
                <strong style="color: ${shouldSuspend ? "#991b1b" : "#92400e"};">
                  ${newStrikeCount} / ${STRIKE_LIMIT}
                </strong>
                ${shouldSuspend ? " — <strong>VENDOR HAS BEEN AUTO-SUSPENDED</strong>" : ""}
              </td>
            </tr>
            ${evidence_url ? `
            <tr>
              <td style="padding: 10px 16px; font-weight: 600;">Evidence</td>
              <td style="padding: 10px 16px;">
                <a href="${evidence_url}" style="color: #2563eb;">View Evidence Screenshot</a>
              </td>
            </tr>` : ""}
          </table>

          <div style="margin-top: 24px; padding: 16px; background: #f0f9ff; border-radius: 8px; font-size: 13px; color: #0369a1;">
            <strong>Action required:</strong> Log in to the Campus Market admin dashboard to review this report and take action.
          </div>

          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
            This is an automated notification from Campus Market. Report submitted at ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} (WAT).
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Campus Market <noreply@campusmarketapp.com>",
          to: [ADMIN_EMAIL],
          subject,
          html,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        strike_count: newStrikeCount,
        auto_suspended: shouldSuspend,
        message: shouldSuspend
          ? "This vendor has been automatically suspended after 5 reports."
          : "Report submitted. Admins have been notified.",
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
