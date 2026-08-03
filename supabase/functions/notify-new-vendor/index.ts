// Notifies admins (super_admin / admin) and the vendor's campus sub-admins
// immediately when a new vendor signup request is submitted.
// Sends: email (Resend, verified sender) + push (via send-push, system key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "Campus Market <notifications@contact.campusmarketapp.com>";
const APP_URL = "https://campusmarketapp.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Authenticate caller (the signing-up vendor) ────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { vendor_id } = await req.json();
    if (!vendor_id || typeof vendor_id !== "string") {
      return new Response(JSON.stringify({ error: "vendor_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, user_id, business_name, category, school_id, contact_number, created_at")
      .eq("id", vendor_id)
      .maybeSingle();

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the vendor owner (or an admin) may trigger this
    const { data: callerRoles } = await supabase
      .from("user_roles").select("role").eq("user_id", callerId);
    const callerIsAdmin = (callerRoles || []).some((r: any) =>
      ["admin", "super_admin", "sub_admin"].includes(r.role));
    if (vendor.user_id !== callerId && !callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Vendor details for the notification body ───────────────────────────
    const { data: vendorProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", vendor.user_id)
      .maybeSingle();

    let signupEmail = vendorProfile?.email || null;
    if (!signupEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(vendor.user_id);
      signupEmail = authUser?.user?.email ?? null;
    }

    const { data: school } = vendor.school_id
      ? await supabase.from("schools").select("name").eq("id", vendor.school_id).maybeSingle()
      : { data: null as any };

    const fullName = [vendorProfile?.first_name, vendorProfile?.last_name]
      .filter(Boolean).join(" ") || "—";
    const adminLink = `${APP_URL}/admin/vendors?vendor=${vendor.id}`;

    // ── Resolve admin recipients ───────────────────────────────────────────
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role, school_id, assigned_school_id");

    const recipients = (adminRoles || []).filter((r: any) => {
      if (r.role === "super_admin" || r.role === "admin") return true;
      if (r.role === "sub_admin") {
        const scoped = r.assigned_school_id || r.school_id;
        return !scoped || scoped === vendor.school_id;
      }
      return false;
    });
    const adminUserIds = [...new Set(recipients.map((r: any) => r.user_id))];

    // ── Push notification ──────────────────────────────────────────────────
    let pushSent = 0;
    const SYSTEM_KEY = Deno.env.get("PUSH_SYSTEM_KEY") || "";
    if (adminUserIds.length && SYSTEM_KEY) {
      await Promise.all(adminUserIds.map(async (uid) => {
        try {
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-system-key": SYSTEM_KEY },
            body: JSON.stringify({
              user_id: uid,
              title: `New vendor request — ${vendor.business_name}`,
              body: `${fullName} (${signupEmail || "no email"}) applied${school?.name ? ` from ${school.name}` : ""}. Tap to review.`,
              url: `/admin/vendors?vendor=${vendor.id}`,
              tag: `new-vendor:${vendor.id}`,
              type: "broadcast",
            }),
          });
          const j = await r.json().catch(() => ({}));
          pushSent += Number(j?.sent || 0);
        } catch (e) {
          console.error("push to admin failed", uid, e);
        }
      }));
    }

    // ── Email notification ─────────────────────────────────────────────────
    const adminEmails: string[] = [];
    if (adminUserIds.length) {
      const { data: adminProfiles } = await supabase
        .from("profiles").select("email").in("user_id", adminUserIds);
      for (const p of adminProfiles || []) {
        if ((p as any).email) adminEmails.push((p as any).email);
      }
    }
    const uniqueEmails = [...new Set(adminEmails)];

    let emailSent = false;
    let emailError: string | null = null;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && uniqueEmails.length) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f7f7f9;border-radius:12px">
          <div style="background:#0f766e;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
            <h2 style="margin:0;font-size:18px">New vendor signup request</h2>
          </div>
          <div style="background:#fff;padding:20px;border-radius:0 0 10px 10px;color:#222;line-height:1.6">
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#666">Business</td><td style="padding:6px 0"><strong>${vendor.business_name}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666">Owner</td><td style="padding:6px 0">${fullName}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Signup email</td><td style="padding:6px 0">${signupEmail || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${vendor.contact_number || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Category</td><td style="padding:6px 0">${vendor.category || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Campus</td><td style="padding:6px 0">${school?.name || "—"}</td></tr>
            </table>
            <p style="margin-top:20px">
              <a href="${adminLink}" style="display:inline-block;padding:11px 20px;background:#f97316;color:#fff;text-decoration:none;border-radius:8px">Review this vendor</a>
            </p>
            <p style="font-size:12px;color:#888;margin-top:20px">Automated alert from Campus Market.</p>
          </div>
        </div>`;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: uniqueEmails,
          subject: `New vendor request — ${vendor.business_name}`,
          html,
        }),
      });
      if (r.ok) {
        emailSent = true;
      } else {
        emailError = await r.text();
        console.error("Resend error:", r.status, emailError);
      }
    }

    // ── In-app announcement for admins ─────────────────────────────────────
    await supabase.from("platform_announcements").insert({
      type: "vendor_request",
      title: `New vendor request: ${vendor.business_name}`,
      message: `${fullName} (${signupEmail || "no email"}) submitted a vendor request${school?.name ? ` for ${school.name}` : ""}.`,
      related_id: vendor.id,
      school_id: vendor.school_id,
    });

    return new Response(JSON.stringify({
      ok: true,
      admins: adminUserIds.length,
      push_sent: pushSent,
      email_sent: emailSent,
      email_error: emailError,
      emailed: uniqueEmails.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("notify-new-vendor error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
