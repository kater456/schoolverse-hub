// Sends a notification email to the super admin (calebworks4@gmail.com)
// Triggered from app code on key events: new vendor approved, new deal, platform updates.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAIL = "calebworks4@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { type, title, message, link } = await req.json();
    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Missing title or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `[Campus Market] ${title}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f7f7f9;border-radius:12px">
        <div style="background:#0f766e;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
          <h2 style="margin:0">${title}</h2>
          <p style="margin:4px 0 0;opacity:.85;font-size:13px">Type: ${type || "general"}</p>
        </div>
        <div style="background:#fff;padding:20px;border-radius:0 0 10px 10px;line-height:1.55;color:#222">
          <p>${message}</p>
          ${link ? `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#f97316;color:#fff;text-decoration:none;border-radius:8px">View in Dashboard</a></p>` : ""}
          <p style="font-size:12px;color:#888;margin-top:24px">This is an automated notification from Campus Market.</p>
        </div>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Campus Market <onboarding@resend.dev>",
        to: [SUPER_ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Resend error");

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
