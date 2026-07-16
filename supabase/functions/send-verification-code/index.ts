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

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate-limit check: reject if an unexpired, unconsumed code already exists for that email
    // generated within the last 60 seconds (using created_at > now() - 60s)
    const { data: existingCodes, error: rateLimitErr } = await supabase
      .from("email_verification_codes")
      .select("created_at")
      .eq("email", normalizedEmail)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (rateLimitErr) {
      console.error("Rate-limit check DB error:", rateLimitErr);
    }

    if (existingCodes && existingCodes.length > 0) {
      const lastCreated = new Date(existingCodes[0].created_at).getTime();
      const now = new Date().getTime();
      const secondsDiff = (now - lastCreated) / 1000;
      if (secondsDiff < 60) {
        return new Response(JSON.stringify({ error: "Please wait 60 seconds before requesting another code." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Look up user_id from auth.users (public or service_role access)
    // Note that we must query using the service role admin API
    const { data: { users }, error: userLookupErr } = await supabase.auth.admin.listUsers();
    if (userLookupErr) {
      console.error("User lookup error:", userLookupErr);
      return new Response(JSON.stringify({ error: "Failed to look up user account" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchedUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!matchedUser) {
      return new Response(JSON.stringify({ error: "No registered user found with this email" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = matchedUser.id;

    // Generate a secure 6-digit verification code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiration: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Insert code into email_verification_codes table
    const { error: insertErr } = await supabase
      .from("email_verification_codes")
      .insert({
        user_id: userId,
        email: normalizedEmail,
        code: rawCode,
        expires_at: expiresAt
      });

    if (insertErr) {
      console.error("DB Insert verification code error:", insertErr);
      throw new Error("Failed to store verification code");
    }

    // Send email via Resend with Campus Market branding
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Campus Market <notifications@contact.campusmarketapp.com>",
        to: [normalizedEmail],
        subject: `🔑 Your Campus Market Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; color: #1a1a2e; margin: 0; font-weight: bold;">Campus Market</h1>
              <p style="color: #666; font-size: 14px; margin-top: 4px;">Your Campus Hub for Buying, Selling & Connecting</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center; border: 1px solid #f1f3f5;">
              <p style="color: #495057; font-size: 16px; margin: 0 0 16px 0;">
                To complete your sign-up, use the 6-digit verification code below:
              </p>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #3b82f6; background: #e0f2fe; padding: 12px 24px; display: inline-block; border-radius: 8px; margin-bottom: 12px; font-family: monospace;">
                ${rawCode}
              </div>
              <p style="color: #868e96; font-size: 13px; margin: 8px 0 0 0;">
                This code will expire in 15 minutes.
              </p>
            </div>
            <p style="color: #495057; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              If you did not request this verification code, please ignore this email or reach out to support.
            </p>
            <div style="border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center;">
              <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Campus Market. All rights reserved.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend send error:", emailResponse.status, errText);
      throw new Error(`Failed to send email via Resend: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Verification code sent successfully" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-verification-code error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
