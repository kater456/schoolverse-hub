import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Veo 3.1 via Google AI Studio (Gemini API endpoint) ─────────────────────
// Model: veo-3.0-generate-preview (latest Veo 3 available via API)
const VEO_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not configured in Supabase secrets");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { vendor_id, prompt, aspect_ratio, duration_seconds } = await req.json();

    if (!vendor_id || !prompt) {
      return new Response(JSON.stringify({ error: "vendor_id and prompt are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Gate: only verified + upgraded vendors ────────────────────────────
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, business_name, is_verified, is_store_upgraded, store_upgrade_expires_at")
      .eq("id", vendor_id)
      .single();

    if (!vendor?.is_verified || !vendor?.is_store_upgraded) {
      return new Response(
        JSON.stringify({ error: "Video generation is available to Verified + Upgraded stores only." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build an enhanced product-focused prompt ──────────────────────────
    const enhancedPrompt = `Professional product showcase video for a campus marketplace store called "${vendor.business_name}". ${prompt}. Cinematic lighting, clean background, high quality, suitable for a business storefront. No text overlays.`;

    console.log("Sending to Veo:", { prompt: enhancedPrompt, aspect_ratio, duration_seconds });

    // ── Call Veo 3.1 long-running operation ───────────────────────────────
    const veoRes = await fetch(`${VEO_ENDPOINT}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{
          prompt: enhancedPrompt,
        }],
        parameters: {
          aspectRatio:     aspect_ratio     || "9:16",   // portrait for mobile reels
          durationSeconds: duration_seconds || 5,
          personGeneration: "dont_allow",               // campus safety
          sampleCount: 1,
        },
      }),
    });

    if (!veoRes.ok) {
      const errText = await veoRes.text();
      console.error("Veo API error:", veoRes.status, errText);
      throw new Error(`Veo API error ${veoRes.status}: ${errText}`);
    }

    const veoData = await veoRes.json();
    console.log("Veo response:", JSON.stringify(veoData).slice(0, 300));

    // ── Veo returns a long-running operation name ─────────────────────────
    const operationName = veoData?.name;
    if (!operationName) throw new Error("No operation name returned from Veo");

    // Save pending job to DB so frontend can poll
    const { data: job, error: jobErr } = await (supabase as any)
      .from("vendor_ai_videos")
      .insert({
        vendor_id,
        operation_name: operationName,
        prompt:         enhancedPrompt,
        status:         "processing",
        aspect_ratio:   aspect_ratio || "9:16",
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    return new Response(JSON.stringify({
      job_id: job.id,
      operation_name: operationName,
      status: "processing",
      message: "Video is generating. Poll /check-veo-video with job_id for status.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-veo-video error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
