import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
let VAPID_SUBJECT   = Deno.env.get("VAPID_SUBJECT") || "mailto:calebworks4@gmail.com";
if (VAPID_SUBJECT && !VAPID_SUBJECT.startsWith("mailto:") && !VAPID_SUBJECT.startsWith("http")) {
  VAPID_SUBJECT = `mailto:${VAPID_SUBJECT}`;
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Professional notification templates (LinkedIn-style business language) ───
// Each event type maps to a precise, professional headline + subtext.
// These replace generic "You have a new like" with real business context.
const NOTIFICATION_TEMPLATES: Record<string, (data: Record<string, string>) => { title: string; body: string }> = {
  // ── Storefront activity ────────────────────────────────────────────────────
  profile_view: (d) => ({
    title: `${d.viewer || "A potential client"} viewed your storefront`,
    body:  "Your business profile received a new visit. Keep your listings sharp.",
  }),
  profile_view_milestone: (d) => ({
    title: `Your storefront reached ${d.count} profile views`,
    body:  "Your visibility on Campus Market is growing. Consider posting a new deal.",
  }),

  // ── Engagement ─────────────────────────────────────────────────────────────
  new_enquiry: (d) => ({
    title: `New business enquiry from ${d.sender || "a potential client"}`,
    body:  d.preview ? `"${d.preview}"` : "A client has sent you a message. Respond promptly.",
  }),
  new_comment: (d) => ({
    title: `${d.sender || "A client"} commented on your listing`,
    body:  d.preview ? `"${d.preview}"` : "Check your storefront to review and respond.",
  }),
  new_like: (d) => ({
    title: `${d.sender || "A client"} endorsed your storefront`,
    body:  "Your business is gaining recognition on campus.",
  }),
  new_connection: (d) => ({
    title: `New connection request from ${d.sender || "a campus member"}`,
    body:  "Expand your campus network by accepting their request.",
  }),

  // ── Orders & transactions ──────────────────────────────────────────────────
  new_order: (d) => ({
    title: `New order placed — ${d.item || "item requested"}`,
    body:  `${d.sender || "A client"} has placed an order. Confirm and arrange delivery.`,
  }),
  order_confirmed: (d) => ({
    title: "Transaction confirmed by your client",
    body:  `Your client confirmed receipt of ${d.item || "the item"}. Transaction complete.`,
  }),
  order_delivered: (d) => ({
    title: "Delivery acknowledged by client",
    body:  "Your client has confirmed the successful delivery of their order.",
  }),

  // ── Reputation ─────────────────────────────────────────────────────────────
  new_rating: (d) => ({
    title: `${d.sender || "A client"} rated your business — ${d.rating || "★★★★★"}`,
    body:  d.preview ? `"${d.preview}"` : "Client feedback strengthens your business reputation.",
  }),
  new_testimonial: (d) => ({
    title: "A client submitted a testimonial for your store",
    body:  "Your new customer review is pending approval. Build trust, win more clients.",
  }),

  // ── Deals & promotions ─────────────────────────────────────────────────────
  deal_expiring: (d) => ({
    title: `Your deal "${d.deal || "active promotion"}" expires in ${d.hours || "24"} hours`,
    body:  "Renew or replace this offer to maintain client engagement.",
  }),
  deal_viewed: (d) => ({
    title: `Your deal "${d.deal || "promotion"}" attracted ${d.count || "new"} views today`,
    body:  "Clients are engaging with your promotional offer.",
  }),

  // ── Account & verification ─────────────────────────────────────────────────
  verified_badge: () => ({
    title: "Your business is now Verified on Campus Market ✅",
    body:  "Your verified badge is live. Clients now see you as a trusted campus trader.",
  }),
  store_upgraded: () => ({
    title: "Your store upgrade is now active",
    body:  "Premium features are live on your storefront for the next 30 days.",
  }),
  upgrade_expiring: (d) => ({
    title: `Your premium store upgrade expires in ${d.days || "3"} days`,
    body:  "Renew your store upgrade to keep premium features and client trust signals active.",
  }),

  // ── AI & Community ─────────────────────────────────────────────────────────
  ai_insight: (d) => ({
    title: "Market Mind has a new insight for your business",
    body:  d.preview || "Your AI advisor analysed your store data. New recommendations are ready.",
  }),
  community_post: () => ({
    title: "Your community received a new post from Market Mind",
    body:  "An AI-generated business update is ready for your review and publication.",
  }),

  // ── Platform & admin ──────────────────────────────────────────────────────
  report_resolved: () => ({
    title: "Your report has been reviewed by Campus Market",
    body:  "Our moderation team has completed the review of your submitted report.",
  }),
  broadcast: (d) => ({
    title: d.title || "Update from Campus Market",
    body:  d.body  || "You have a new platform notification.",
  }),
};

// ── Resolve template by type ──────────────────────────────────────────────────
function resolveTemplate(
  type: string,
  data: Record<string, string>,
  customTitle?: string,
  customBody?: string,
): { title: string; body: string } {
  if (customTitle && customBody) return { title: customTitle, body: customBody };
  const fn = NOTIFICATION_TEMPLATES[type];
  if (fn) return fn(data);
  // Generic fallback with professional tone
  return {
    title: customTitle || "You have a new business notification",
    body:  customBody  || "Open Campus Market to stay on top of your business activity.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Authenticate caller ────────────────────────────────────────────────
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

    const reqBody = await req.json();
    let {
      // Notification content
      type, data, title, body, url,
      // Targeting
      user_id, vendor_id, school_id, audience,
      // Metadata
      tag, sender_id, sender_role,
      // Special: send a test push to the caller's own devices
      mode,
    } = reqBody;

    // ── Test mode: caller -> caller's own subscriptions ───────────────────
    if (mode === "test") {
      user_id = callerId;
      vendor_id = undefined;
      school_id = undefined;
      audience = undefined;
      title = title || "Test notification 🔔";
      body  = body  || "If you see this, push is wired correctly on this device.";
      type  = type  || "broadcast";
    }

    // ── Broadcast / cross-user targeting requires admin role ──────────────
    const isBroadcast = audience === "vendors" || (!user_id && !vendor_id);
    const isSelfPing  = user_id === callerId;
    if (!isSelfPing) {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", callerId);
      const isAdmin = (roleRow || []).some((r: any) =>
        ["admin","super_admin","sub_admin"].includes(r.role));
      if (isBroadcast && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Resolve professional notification copy ──────────────────────────────
    const resolved = resolveTemplate(type || "broadcast", data || {}, title, body);

    // ── Determine target user_ids ───────────────────────────────────────────
    let targetUserIds: string[] | null = null;

    // Direct user targeting
    if (user_id) {
      targetUserIds = [user_id];
    }
    // Vendor owner targeting (most common — e.g. "someone viewed your store")
    else if (vendor_id) {
      const { data: v } = await supabase
        .from("vendors")
        .select("user_id")
        .eq("id", vendor_id)
        .maybeSingle();
      if (v?.user_id) targetUserIds = [v.user_id];
    }
    // Audience-based targeting
    else if (audience === "vendors") {
      const vq = supabase.from("vendors").select("user_id");
      const { data: vendorRows } = school_id ? await vq.eq("school_id", school_id) : await vq;
      targetUserIds = (vendorRows || []).map((v: any) => v.user_id).filter(Boolean);
    }

    // ── Fetch push subscriptions ────────────────────────────────────────────
    let subsQuery = supabase.from("push_subscriptions").select("*");

    if (targetUserIds !== null) {
      if (targetUserIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0, removed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subsQuery = subsQuery.in("user_id", targetUserIds);
    } else if (school_id) {
      subsQuery = subsQuery.or(`school_id.eq.${school_id},school_id.is.null`);
    }

    const { data: subs, error } = await subsQuery;
    if (error) throw error;

    // ── Send notifications ──────────────────────────────────────────────────
    const payload = JSON.stringify({
      title: resolved.title,
      body:  resolved.body,
      url:   url || "/",
      tag:   tag || type || "campus-market",
      icon:  "/pwa-192x192.png",
      badge: "/pwa-64x64.png",
    });

    const stale: string[] = [];
    await Promise.all((subs || []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.endpoint);
      }
    }));

    // Clean stale subscriptions
    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", stale);
    }

    const sentCount = (subs?.length || 0) - stale.length;

    // ── Audit log ───────────────────────────────────────────────────────────
    if (sender_id) {
      await supabase.from("admin_activity_log").insert({
        admin_id:    sender_id,
        action:      "push_broadcast",
        target_type: "push",
        details: {
          type, title: resolved.title, body: resolved.body,
          url, school_id, audience, tag, sender_role,
          recipients: sentCount,
        },
      });
    }

    return new Response(JSON.stringify({ sent: sentCount, removed: stale.length, type, title: resolved.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("send-push error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
