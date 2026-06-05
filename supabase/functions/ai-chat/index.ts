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

    const { messages, school_id } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active approved vendors for context
    let vendorQuery = supabase
      .from("vendors")
      .select("id, business_name, category, description, contact_number, campus_locations(name), schools(name)")
      .eq("is_approved", true)
      .eq("is_active", true)
      .limit(80);

    if (school_id) vendorQuery = vendorQuery.eq("school_id", school_id);

    const { data: vendors } = await vendorQuery;

    const vendorList = (vendors || []).map((v: any) =>
      `- [${v.id}] ${v.business_name} (${v.category})${v.campus_locations?.name ? ` @ ${v.campus_locations.name}` : ""}${v.schools?.name ? `, ${v.schools.name}` : ""}: ${v.description || "—"}. Call: ${v.contact_number}`
    ).join("\n");

    const systemPrompt = `You are the Campus Market assistant — a friendly student-to-student campus marketplace.

RULES:
- Keep replies SHORT (1-3 sentences), warm, and conversational. No long paragraphs.
- You can help with: finding vendors, checking promos, product availability, how to register as a vendor, payment/Paystack, delivery questions.
- To recommend a specific vendor, mention them by name and append the token [CONNECT:<vendor-id>] at the end of your message (the UI will open their profile).
- If you cannot confidently answer or it's vendor-specific (price, availability, custom orders), reply: "Let me connect you to the vendor directly 👉" and append [CONNECT:<vendor-id>] for the closest matching vendor.
- Never invent vendors. Only use the list below.
- After your reply, return 2-3 short follow-up suggestion chips via the structured field.

ACTIVE VENDORS:
${vendorList || "(none right now)"}
`;


    // Build messages for Lovable AI (OpenAI-compatible format)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content
      || "Sorry, I couldn't generate a response right now.";

    return new Response(JSON.stringify({ reply }), {
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
