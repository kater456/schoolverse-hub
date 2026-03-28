import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

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

    // Build Gemini conversation format
    // Gemini uses "user" and "model" roles (not "assistant")
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Prepend system prompt as first user message if conversation just started
    const contents = [
      { role: "user",  parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Got it! I'm ready to help students find vendors and answer questions." }] },
      ...geminiMessages,
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "Gemini API error";
      throw new Error(errMsg);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
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
