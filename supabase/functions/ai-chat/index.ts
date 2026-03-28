  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

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

    // Fetch all active approved vendors to give Claude real context
    let vendorQuery = supabase
      .from("vendors")
      .select("id, business_name, category, description, contact_number, country, campus_locations(name), schools(name)")
      .eq("is_approved", true)
      .eq("is_active", true)
      .limit(80);

    if (school_id) {
      vendorQuery = vendorQuery.eq("school_id", school_id);
    }

    const { data: vendors } = await vendorQuery;

    // Format vendors into a readable list for Claude
    const vendorList = (vendors || []).map((v: any) =>
      `- ${v.business_name} (${v.category})${v.campus_locations?.name ? ` at ${v.campus_locations.name}` : ""}${v.schools?.name ? `, ${v.schools.name}` : ""}: ${v.description || "No description"}. Contact: ${v.contact_number}`
    ).join("\n");

    const systemPrompt = `You are a friendly and helpful AI assistant for Campus Market — a campus marketplace platform where student vendors sell products and services.

You have two jobs:
1. Help users find vendors and businesses on the platform
2. Answer general questions helpfully

Here are all the currently active vendors on the platform:
${vendorList || "No vendors available at the moment."}

When a user asks about vendors, products, or services:
- Search the vendor list above and recommend the most relevant ones
- Mention the vendor name, category, location, and contact number
- Be specific and helpful

When answering general questions, be concise, friendly, and accurate.

Always keep responses short and conversational. Never be overly formal. You're talking to university students.`;

    // Call Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Claude API error");
    }

    const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";

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
