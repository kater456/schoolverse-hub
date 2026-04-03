import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { conversation_id, message_id, content } = await req.json();

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let flagged = false;
    let flagReason = null;
    let detectedPrice = null;
    let summary = null;

    if (LOVABLE_API_KEY) {
      const prompt = `You are a safety monitor for Campus Market, a student marketplace platform in Nigeria.

Analyze this chat message and respond ONLY with valid JSON (no markdown, no explanation):

Message: "${content}"

Return exactly this JSON structure:
{
  "is_suspicious": boolean,
  "flag_reason": string or null,
  "detected_price": number or null,
  "price_currency": "NGN" or null,
  "agreement_detected": boolean,
  "summary": string or null
}

Rules:
- is_suspicious = true if message contains: requests to pay outside platform, threats, harassment, fake identity claims, advance fee fraud patterns
- flag_reason = brief reason if suspicious, else null  
- detected_price = number if a price/amount is mentioned (e.g. 5000 from "₦5,000" or "5k")
- agreement_detected = true if buyer and vendor seem to be agreeing on a price or deal
- summary = one sentence describing what the message is about, or null if plain greeting`;

      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 200,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          flagged = parsed.is_suspicious || false;
          flagReason = parsed.flag_reason || null;
          detectedPrice = parsed.detected_price || null;
          summary = parsed.summary || null;

          if (parsed.agreement_detected && detectedPrice) {
            await supabase.from("conversations").update({
              last_message: content,
              last_message_at: new Date().toISOString(),
            }).eq("id", conversation_id);
          }
        } catch (_) { /* parse error, skip */ }
      } else {
        console.error("AI gateway error:", res.status, await res.text());
      }
    }

    if (message_id && (flagged || detectedPrice)) {
      await (supabase as any).from("messages").update({
        ai_flagged: flagged,
        ai_flag_reason: flagReason,
      }).eq("id", message_id);
    }

    if (flagged) {
      await (supabase as any).from("conversations").update({
        is_flagged: true,
        flagged_reason: flagReason,
      }).eq("id", conversation_id);
    }

    return new Response(
      JSON.stringify({ flagged, flag_reason: flagReason, detected_price: detectedPrice, summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
