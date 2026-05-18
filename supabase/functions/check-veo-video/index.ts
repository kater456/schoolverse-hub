import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPERATIONS_BASE = "https://generativelanguage.googleapis.com/v1beta";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    // Get the pending job
    const { data: job } = await (supabase as any)
      .from("vendor_ai_videos")
      .select("*")
      .eq("id", job_id)
      .single();

    if (!job) throw new Error("Job not found");
    if (job.status === "complete") {
      return new Response(JSON.stringify({ status: "complete", video_url: job.video_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status === "failed") {
      return new Response(JSON.stringify({ status: "failed", error: job.error_message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll Google long-running operation
    const opRes = await fetch(`${OPERATIONS_BASE}/${job.operation_name}?key=${GOOGLE_API_KEY}`);
    if (!opRes.ok) throw new Error(`Operation poll failed: ${opRes.status}`);

    const opData = await opRes.json();
    console.log("Operation status:", JSON.stringify(opData).slice(0, 400));

    if (opData.error) {
      await (supabase as any).from("vendor_ai_videos")
        .update({ status: "failed", error_message: opData.error.message })
        .eq("id", job_id);
      return new Response(JSON.stringify({ status: "failed", error: opData.error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!opData.done) {
      return new Response(JSON.stringify({ status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Operation complete — extract video URL
    const generatedVideos = opData.response?.generateVideoResponse?.generatedSamples;
    const videoUri = generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      await (supabase as any).from("vendor_ai_videos")
        .update({ status: "failed", error_message: "No video URI in response" })
        .eq("id", job_id);
      return new Response(JSON.stringify({ status: "failed", error: "No video in response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download video and store in Supabase Storage
    const videoRes = await fetch(`${videoUri}&key=${GOOGLE_API_KEY}`);
    if (!videoRes.ok) throw new Error("Failed to download generated video");

    const videoBlob = await videoRes.blob();
    const storagePath = `${job.vendor_id}/ai-videos/${job_id}.mp4`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("vendor-media")
      .upload(storagePath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from("vendor-media")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Update job and also add to vendor_videos so it appears in their reel
    await Promise.all([
      (supabase as any).from("vendor_ai_videos")
        .update({ status: "complete", video_url: publicUrl })
        .eq("id", job_id),
      supabase.from("vendor_videos").insert({
        vendor_id: job.vendor_id,
        video_url: publicUrl,
      }),
    ]);

    return new Response(JSON.stringify({ status: "complete", video_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("check-veo-video error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
