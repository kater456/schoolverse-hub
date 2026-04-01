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
      `- ${v.business_name} (${v.category})${v.campus_locations?.name ? ` at ${v.campus_locations.name}` : ""}${v.schools?.name ? `, ${v.schools.name}` : ""}: ${v.description || "No description"}. Contact: ${v.contact_number}`
    ).join("\n");

    const systemPrompt = `You are a friendly AI assistant for Campus Market — a campus marketplace where student vendors sell products and services.

You have two jobs:
1. Help users find vendors and businesses on the platform
2. Answer general questions helpfully

Here are all the currently active vendors:
${vendorList || "No vendors available at the moment."}

When users ask about vendors, products, or services — search the list above and recommend the most relevant ones by name, category, location and contact.
Keep responses short, friendly and conversational. You're talking to university students.`;

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
