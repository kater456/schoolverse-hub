/**
 * VendorAdStudio.tsx
 * ==================
 * AI-powered ad video studio. Generates personalised scripts AND actual
 * Veo 3.1 videos — all in one seamless flow for Pro vendors.
 *
 * PLACEMENT: src/components/vendor/VendorAdStudio.tsx
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Copy, CheckCheck, Loader2, RefreshCw,
  Film, Zap, Play, Download, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdPrompt {
  title:    string;
  prompt:   string;
  hook:     string;
  cta:      string;
  platform: string;
  duration: string;
  tip:      string;
}

type VideoStatus = "idle" | "generating" | "processing" | "complete" | "failed";

const PLATFORM_COLORS: Record<string, string> = {
  "Instagram Reels": "#e1306c",
  "TikTok":          "#010101",
  "WhatsApp Status": "#25d366",
  "YouTube Shorts":  "#ff0000",
};

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
  "linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)",
];

// ─── Video generation hook ────────────────────────────────────────────────────
function useVideoGen(vendorId: string) {
  const [status,   setStatus]   = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId,    setJobId]    = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    if (!jobId || status !== "processing") return;
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("check-veo-video", {
          body: { job_id: jobId },
        });
        if (data?.status === "complete" && data.video_url) {
          setVideoUrl(data.video_url);
          setStatus("complete");
          stopPolling();
          toast({ title: "🎬 Video ready!", description: "Your ad video has been generated." });
        } else if (data?.status === "failed") {
          setError(data.error || "Generation failed");
          setStatus("failed");
          stopPolling();
        }
      } catch { /* keep polling on network hiccup */ }
    }, 5000);

    return stopPolling;
  }, [jobId, status]);

  const generate = async (prompt: string) => {
    setStatus("generating");
    setVideoUrl(null);
    setError(null);
    setJobId(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-veo-video", {
        body: { vendor_id: vendorId, prompt, aspect_ratio: "9:16", duration_seconds: 5 },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error);
      setJobId(data.job_id);
      setStatus("processing");
    } catch (err: any) {
      setError(err.message || "Failed to start generation");
      setStatus("failed");
    }
  };

  const reset = () => { stopPolling(); setStatus("idle"); setVideoUrl(null); setError(null); setJobId(null); };

  return { status, videoUrl, error, generate, reset };
}

// ─── Video player panel ───────────────────────────────────────────────────────
function VideoPanel({
  status, videoUrl, error, prompt, onGenerate, onReset,
}: {
  status: VideoStatus; videoUrl: string | null; error: string | null;
  prompt: string; onGenerate: () => void; onReset: () => void;
}) {
  if (status === "idle") {
    return (
      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold text-white/80"
      >
        <Film className="h-4 w-4" />
        Generate this video with Veo 3.1
      </button>
    );
  }

  if (status === "generating" || status === "processing") {
    const msgs = [
      "Sending prompt to Google Veo 3.1…",
      "AI is rendering your video…",
      "Adding cinematic touches…",
      "Almost there…",
    ];
    return (
      <div className="w-full rounded-xl bg-white/8 border border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="h-4 w-4 text-blue-300 animate-spin flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">Generating your video</p>
            <p className="text-[10px] text-white/40 mt-0.5">Veo 3.1 · ~60 seconds · 9:16 portrait</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="w-full rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-300">Generation failed</p>
          <p className="text-[10px] text-red-300/60 mt-0.5 leading-relaxed">{error}</p>
          <button onClick={onReset} className="mt-2 text-[10px] text-red-300 underline font-semibold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === "complete" && videoUrl) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-white/10">
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full aspect-[9/16] max-h-64 object-cover bg-black"
        />
        <div className="flex gap-2 p-2 bg-black/40">
          <a
            href={videoUrl}
            download="campus-market-ad.mp4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> New Version
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Prompt card ──────────────────────────────────────────────────────────────
function PromptCard({
  prompt, index, vendorId, copied, onCopy,
}: {
  prompt: AdPrompt; index: number; vendorId: string;
  copied: string; onCopy: (text: string, id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { status, videoUrl, error, generate, reset } = useVideoGen(vendorId);
  const platformColor = PLATFORM_COLORS[prompt.platform] || "#6366f1";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.14)" }}>
      {/* Dark header */}
      <div className="relative overflow-hidden px-5 pt-5 pb-5"
        style={{ background: CARD_GRADIENTS[index % CARD_GRADIENTS.length] }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${platformColor}, transparent)` }} />

        <div className="relative space-y-3">
          {/* Platform */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${platformColor}25`, color: platformColor, border: `1px solid ${platformColor}40` }}>
              {prompt.platform} · {prompt.duration}
            </span>
            {status === "complete" && (
              <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Video Ready
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-bold text-base leading-tight">{prompt.title}</h3>

          {/* Hook */}
          <div className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Opening Hook</p>
            <p className="text-white text-sm font-semibold leading-snug">{prompt.hook}</p>
          </div>

          {/* CTA */}
          <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">CTA Caption</p>
            <p className="text-white/80 text-xs leading-snug">{prompt.cta}</p>
          </div>

          {/* ── Video generation panel ── */}
          <VideoPanel
            status={status}
            videoUrl={videoUrl}
            error={error}
            prompt={prompt.prompt}
            onGenerate={() => generate(prompt.prompt)}
            onReset={reset}
          />
        </div>
      </div>

      {/* Light card body */}
      <div className="bg-card border-x border-b border-border/50 rounded-b-2xl">
        {/* Expandable prompt */}
        <button
          className="w-full px-5 py-3.5 text-left flex items-start gap-3 hover:bg-muted/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Film className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground mb-0.5">Video Prompt</p>
            <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {prompt.prompt}
            </p>
          </div>
          <span className="text-muted-foreground text-xs mt-0.5 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && prompt.tip && (
          <div className="px-5 pb-3">
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">💡 Filming Tip</p>
              <p className="text-xs text-amber-800 leading-relaxed">{prompt.tip}</p>
            </div>
          </div>
        )}

        {/* Copy row */}
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            onClick={() => onCopy(prompt.prompt, `prompt-${index}`)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted transition-colors"
          >
            {copied === `prompt-${index}`
              ? <><CheckCheck className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">Copied!</span></>
              : <><Copy className="h-3.5 w-3.5" />Copy Prompt</>}
          </button>
          <button
            onClick={() => onCopy(`${prompt.hook}\n\n${prompt.cta}`, `cap-${index}`)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted transition-colors"
          >
            {copied === `cap-${index}`
              ? <><CheckCheck className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">Copied!</span></>
              : <><Copy className="h-3.5 w-3.5" />Copy Caption</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
          <div className="h-52 bg-gradient-to-br from-slate-800 to-slate-700" />
          <div className="bg-card border-x border-b border-border/50 rounded-b-2xl p-4 space-y-2">
            <div className="h-3 bg-muted rounded-full w-3/4" />
            <div className="h-3 bg-muted rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function VendorAdStudio({ vendor }: { vendor: any }) {
  const { toast } = useToast();
  const [prompts,   setPrompts]   = useState<AdPrompt[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied,    setCopied]    = useState("");

  const generate = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const { data, error } = await supabase.functions.invoke("vendor-ai-advisor", {
        body: { vendor_id: vendor.id, mode: "ad_prompts" },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      if (!data?.prompts?.length) throw new Error("No prompts returned");
      setPrompts(data.prompts);
      setGenerated(true);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 2500);
    });
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!generated && !loading) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div className="relative px-6 py-8 overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #1d4ed8 100%)" }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Campus Market · Pro</p>
                <h2 className="text-white font-bold text-lg leading-none">Ad Video Studio</h2>
              </div>
            </div>

            <p className="text-blue-100 text-sm leading-relaxed mb-5">
              AI writes <strong className="text-white">3 personalised video scripts</strong> for{" "}
              <strong className="text-white">{vendor.business_name}</strong>, then generates the{" "}
              <strong className="text-white">actual video</strong> using Google Veo 3.1. One tap. Done.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { icon: "✍️", label: "Script written\nby AI" },
                { icon: "🎬", label: "Video generated\nby Veo 3.1" },
                { icon: "📲", label: "Ready to post\nto social media" },
              ].map(({ icon, label }) => (
                <div key={label} className="text-center bg-white/8 border border-white/10 rounded-xl py-3 px-1">
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="text-[9px] text-white/60 font-medium leading-tight whitespace-pre-line">{label}</p>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 font-bold text-sm gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white", border: "none" }}
              onClick={generate}
            >
              <Zap className="h-4 w-4" />
              Generate My Ad Videos
            </Button>
            <p className="text-blue-200/50 text-[10px] text-center mt-2">
              Powered by Google Veo 3.1 · Unique to your store · Portrait 9:16
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl px-5 py-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)" }}>
          <Loader2 className="h-5 w-5 text-white animate-spin flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Writing your ad scripts…</p>
            <p className="text-blue-200 text-xs mt-0.5">Reading your store data and crafting 3 concepts for {vendor.business_name}</p>
          </div>
        </div>
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Your Ad Studio</p>
            <p className="text-blue-200 text-[11px]">Scripts + videos for {vendor.business_name}</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors bg-white/10 rounded-full px-3 py-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Cards */}
      {prompts.map((p, i) => (
        <PromptCard
          key={i}
          prompt={p}
          index={i}
          vendorId={vendor.id}
          copied={copied}
          onCopy={copy}
        />
      ))}
    </div>
  );
}
