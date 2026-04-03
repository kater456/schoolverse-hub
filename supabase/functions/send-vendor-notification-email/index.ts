import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { vendor_id, type, title, message } = await req.json();
    if (!vendor_id || !title) {
      return new Response(JSON.stringify({ error: "Missing vendor_id or title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vendor's user_id
    const { data: vendor } = await supabase
      .from("vendors")
      .select("user_id, business_name")
      .eq("id", vendor_id)
      .single();

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vendor's email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(vendor.user_id);
    const email = userData?.user?.email;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine emoji based on type
    const emoji = type === "comment" ? "💬" : type === "like" ? "❤️" : type === "milestone" ? "🏆" : "🔔";

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Campus Market <onboarding@resend.dev>",
        to: [email],
        subject: `${emoji} ${title} — Campus Market`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 20px; color: #1a1a2e; margin: 0;">${emoji} ${title}</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">
                Hey <strong>${vendor.business_name}</strong>,
              </p>
              <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 12px;">
                ${message || title}
              </p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              You're receiving this because you're a vendor on Campus Market.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend error:", emailResponse.status, errText);
      // Don't fail the whole request - email is best-effort
      return new Response(JSON.stringify({ sent: false, reason: "email_send_failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Notification email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
