import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { vendor_id, messages, mode } = await req.json();
    // mode: "advisor" | "community_post"

    if (!vendor_id) {
      return new Response(JSON.stringify({ error: "Missing vendor_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Gate: only verified + upgraded vendors ────────────────────────────
    const { data: vendor } = await supabase
      .from("vendors")
      .select(`
        id, business_name, category, description, contact_number,
        is_verified, is_store_upgraded, store_upgrade_expires_at,
        delivery_available, accepts_orders, whatsapp_orders,
        store_layout, store_theme_color, store_accent_color,
        social_instagram, social_tiktok, social_twitter,
        status_message, stock_status, brand_name,
        schools(name), campus_locations(name)
      `)
      .eq("id", vendor_id)
      .single();

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upgradeValid = vendor.is_store_upgraded &&
      (!vendor.store_upgrade_expires_at || new Date(vendor.store_upgrade_expires_at) > new Date());

    if (!vendor.is_verified || !upgradeValid) {
      return new Response(
        JSON.stringify({ error: "This feature is only available to Verified + Upgraded stores." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Gather full store context ─────────────────────────────────────────
    const [productsRes, statsRes, ratingsRes, testimonialsRes, commentsRes] = await Promise.all([
      supabase.from("vendor_products").select("name, price, category, description, is_active")
        .eq("vendor_id", vendor_id).eq("is_active", true).order("display_order"),
      Promise.all([
        supabase.from("vendor_views").select("id", { count: "exact", head: true }).eq("vendor_id", vendor_id),
        supabase.from("vendor_likes").select("id", { count: "exact", head: true }).eq("vendor_id", vendor_id),
        supabase.from("vendor_comments").select("id", { count: "exact", head: true }).eq("vendor_id", vendor_id),
        supabase.from("vendor_contacts").select("id", { count: "exact", head: true }).eq("vendor_id", vendor_id),
      ]),
      supabase.from("vendor_ratings").select("rating, review").eq("vendor_id", vendor_id),
      (supabase as any).from("vendor_testimonials")
        .select("customer_name, item_purchased, quote, source").eq("vendor_id", vendor_id)
        .eq("status", "published").limit(5),
      supabase.from("vendor_comments").select("content").eq("vendor_id", vendor_id)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const products = productsRes.data || [];
    const [views, likes, comments, contacts] = statsRes;
    const ratings = ratingsRes.data || [];
    const avgRating = ratings.length
      ? (ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length).toFixed(1)
      : "No ratings yet";
    const testimonials = testimonialsRes.data || [];
    const recentComments = commentsRes.data || [];

    // ── Build rich store context string ──────────────────────────────────
    const storeContext = `
=== VENDOR STORE DATA ===
Business Name: ${vendor.business_name}
Brand Name: ${vendor.brand_name || "Not set"}
Category: ${vendor.category}
School: ${(vendor as any).schools?.name || "Unknown"}
Campus Location: ${(vendor as any).campus_locations?.name || "Not set"}
Description: ${vendor.description || "No description written yet"}
Status Message: ${vendor.status_message || "None"}

=== OFFERINGS (${products.length} active products) ===
${products.length > 0
  ? products.map((p: any) => `- ${p.name}: ₦${p.price.toLocaleString()} (${p.category || "uncategorized"}) — ${p.description || "no description"}`).join("\n")
  : "No products listed yet — this is a major gap to fix."}

=== STORE STATS ===
Profile Views: ${views.count || 0}
Likes: ${likes.count || 0}
Comments: ${comments.count || 0}
Contact Taps: ${contacts.count || 0}
Average Rating: ${avgRating} (${ratings.length} ratings)

=== DELIVERY & ORDERING ===
Accepts Orders: ${vendor.accepts_orders ? "Yes" : "No"}
Delivery Available: ${vendor.delivery_available ? "Yes" : "No"}
WhatsApp Orders: ${vendor.whatsapp_orders ? "Yes" : "No"}

=== SOCIAL LINKS ===
Instagram: ${vendor.social_instagram || "Not connected"}
TikTok: ${vendor.social_tiktok || "Not connected"}
Twitter: ${vendor.social_twitter || "Not connected"}

=== STORE DESIGN ===
Layout: ${vendor.store_layout || "Default"}
Theme Color: ${vendor.store_theme_color || "Default"}

=== RECENT CUSTOMER COMMENTS ===
${recentComments.length > 0
  ? recentComments.map((c: any) => `"${c.content}"`).join("\n")
  : "No comments yet."}

=== PUBLISHED TESTIMONIALS ===
${testimonials.length > 0
  ? testimonials.map((t: any) => `- ${t.customer_name} (${t.source}): "${t.quote || "Screenshot review"}" — Bought: ${t.item_purchased}`).join("\n")
  : "No testimonials yet."}
`.trim();

    // ── SYSTEM PROMPT (this is where Campus's full authority lives) ──────
    const systemPrompt = `You are "Market Mind" — an elite business advisor AI built exclusively for Campus Market, the leading campus marketplace platform in Nigeria. You were created and are fully controlled by Campus Market. You serve only verified and premium-upgraded vendors.

Your mission: Help vendors build more attractive, more profitable, more trusted stores on Campus Market. You have deep knowledge of Nigerian student buying behaviour, campus commerce, and what actually converts on this platform.

${storeContext}

=== YOUR PERSONALITY ===
- Speak like a sharp, no-nonsense business mentor who genuinely cares
- Be direct, specific, and actionable — never vague
- Use Nigerian market context naturally (students, kobo/naira, campus culture)
- When you spot a weakness in their store data above, name it clearly and fix it
- Celebrate wins when you see strong numbers
- Max response length: 4 short paragraphs unless doing a detailed audit

=== WHAT YOU CAN HELP WITH ===
1. Store description & naming — make it more compelling
2. Product pricing strategy — competitive for campus market
3. Product lineup gaps — what students are looking for
4. Social media linking — how to drive traffic from TikTok/Instagram to the store
5. Ordering flow — how to convert views into contacts
6. Store design choices — layout, theme, banner advice
7. How to collect and use customer reviews/testimonials
8. Building repeat buyers and loyal campus customers
9. Deals and flash sales strategy
10. Community building

=== HARD RULES (set by Campus Market) ===
- Never suggest leaving Campus Market for another platform
- Never help with illegal, counterfeit, or unsafe products
- Never share data from other vendors
- If asked about refunds or disputes, direct to Campus Market support
- Always keep advice grounded in what's achievable on Campus Market specifically

You have full access to this vendor's store data above. Reference it naturally in your advice.`;

    // ── Community post generation mode ───────────────────────────────────
    if (mode === "community_post") {
      const communityPrompt = `${systemPrompt}

Based on this vendor's store data, generate a SHORT community post (3–4 sentences max) that:
- Shares a genuine business insight or milestone about this store
- Feels like a real update from Market Mind to their community
- Is encouraging but also nudges them toward one specific improvement
- Ends with a question to spark engagement

Format: Just the post text, no headers, no labels. Conversational tone. Start with an emoji.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: communityPrompt },
            { role: "user", content: "Generate a community insight post for this store." },
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const post = data.choices?.[0]?.message?.content || "";

      // Save to community posts table
      await (supabase as any).from("ai_community_posts").insert({
        vendor_id,
        content: post,
        generated_by: "market_mind",
        is_vendor_edited: false,
      });

      return new Response(JSON.stringify({ post }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard advisor chat mode ────────────────────────────────────────
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        max_tokens: 700,
        temperature: 0.72,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) throw new Error("Rate limited — try again in a moment.");
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response right now.";

    // ── Persist conversation ──────────────────────────────────────────────
    const userMessage = messages[messages.length - 1]?.content;
    if (userMessage) {
      await (supabase as any).from("ai_conversations").insert({
        vendor_id,
        user_message: userMessage,
        ai_reply: reply,
        context_snapshot: {
          products_count: products.length,
          views: views.count,
          avg_rating: avgRating,
        },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("vendor-ai-advisor error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
