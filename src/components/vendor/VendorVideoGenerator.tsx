import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Film, Loader2, CheckCircle2,
  Play, RefreshCw, Clock, AlertCircle,
} from "lucide-react";

interface Props {
  vendorId: string;
  vendor: any;
}

// Aspect ratio options
const RATIOS = [
  { value: "9:16",  label: "Portrait (9:16)",  sub: "Best for reels & mobile" },
  { value: "16:9",  label: "Landscape (16:9)", sub: "Best for banners"        },
  { value: "1:1",   label: "Square (1:1)",     sub: "Best for product cards"  },
];

// Prompt suggestions tailored to campus market categories
const PROMPT_SUGGESTIONS = [
  "Show my products arranged neatly on a clean white table with soft natural lighting",
  "A smooth camera pan across my product collection with a blurred campus background",
  "Close-up shots of my products rotating slowly on a minimalist display stand",
  "My products styled elegantly with campus aesthetic — books, plants, warm lighting",
  "Quick product showcase with smooth transitions between each item",
];

export default function VendorVideoGenerator({ vendorId, vendor }: Props) {
  const { toast } = useToast();

  const [prompt,       setPrompt]       = useState("");
  const [ratio,        setRatio]        = useState("9:16");
  const [generating,   setGenerating]   = useState(false);
  const [jobId,        setJobId]        = useState<string | null>(null);
  const [jobStatus,    setJobStatus]    = useState<"idle" | "processing" | "complete" | "failed">("idle");
  const [videoUrl,     setVideoUrl]     = useState<string | null>(null);
  const [pastVideos,   setPastVideos]   = useState<any[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUpgraded = vendor?.is_store_upgraded &&
    vendor?.store_upgrade_expires_at &&
    new Date(vendor.store_upgrade_expires_at) > new Date();

  // Load past AI-generated videos
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("vendor_ai_videos")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(6);
      setPastVideos(data || []);
    };
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [vendorId]);

  // Poll for job completion
  const startPolling = (jId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-veo-video", {
          body: { job_id: jId },
        });
        if (error || data?.error) {
          setJobStatus("failed");
          clearInterval(pollRef.current!);
          toast({ title: "Video generation failed", description: data?.error || error?.message, variant: "destructive" });
          return;
        }
        if (data?.status === "complete") {
          setJobStatus("complete");
          setVideoUrl(data.video_url);
          clearInterval(pollRef.current!);
          toast({ title: "🎬 Your video is ready!", description: "It's been added to your store reels." });
          // Refresh past videos
          const { data: vids } = await (supabase as any)
            .from("vendor_ai_videos").select("*").eq("vendor_id", vendorId)
            .order("created_at", { ascending: false }).limit(6);
          setPastVideos(vids || []);
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, 8000); // Poll every 8 seconds (Veo takes 30–120s)
  };

  const generate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Describe what you want in your video", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setJobStatus("idle");
    setVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-veo-video", {
        body: {
          vendor_id:        vendorId,
          prompt:           prompt.trim(),
          aspect_ratio:     ratio,
          duration_seconds: 5,
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setJobId(data.job_id);
      setJobStatus("processing");
      startPolling(data.job_id);
      toast({
        title: "🎬 Video is generating…",
        description: "This usually takes 1–2 minutes. You can stay on this page or come back.",
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setJobStatus("idle");
    }
    setGenerating(false);
  };

  // Not available for non-upgraded stores
  if (!vendor?.is_verified || !isUpgraded) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6 pb-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm font-semibold">AI Video Generation</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Generate professional product showcase videos using Veo 3.1 AI. Available to Verified + Upgraded stores.
          </p>
          <Badge variant="outline" className="text-xs">Requires Verified + Store Upgrade</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/8 via-background to-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground">AI Video Generator</p>
                <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Veo 3.1</Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-400/50 text-emerald-600">Premium</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Describe your product and Veo 3.1 generates a professional video for your store reel. Generated videos are automatically added to your reels tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt input */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Describe Your Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Prompt suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick start — tap a suggestion:</p>
            <div className="flex flex-col gap-1.5">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  disabled={jobStatus === "processing"}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    prompt === s
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-accent/40 hover:bg-muted/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <Label className="text-xs mb-1.5 block">Or write your own description</Label>
            <Textarea
              placeholder="Describe exactly what you want to show in your video. Be specific about your products, style, and mood…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              disabled={jobStatus === "processing"}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{prompt.length}/500 characters</p>
          </div>

          {/* Aspect ratio */}
          <div>
            <Label className="text-xs mb-2 block">Video format</Label>
            <div className="grid grid-cols-3 gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRatio(r.value)}
                  disabled={jobStatus === "processing"}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-colors ${
                    ratio === r.value
                      ? "border-accent bg-accent/10"
                      : "border-border/50 bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  <span className={`text-xs font-semibold ${ratio === r.value ? "text-accent" : "text-foreground"}`}>
                    {r.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            className="w-full bg-gradient-to-r from-accent to-primary text-white gap-2 shadow-md"
            onClick={generate}
            disabled={generating || jobStatus === "processing" || !prompt.trim()}
          >
            {(generating || jobStatus === "processing")
              ? <><Loader2 className="h-4 w-4 animate-spin" />Generating with Veo 3.1…</>
              : <><Sparkles className="h-4 w-4" />Generate Video</>
            }
          </Button>

          {/* Status indicator */}
          {jobStatus === "processing" && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-primary">Veo 3.1 is generating your video</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This takes 1–2 minutes. The video will appear below and in your Reels tab when ready.
                </p>
              </div>
            </div>
          )}

          {jobStatus === "complete" && videoUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Video ready!</p>
              </div>
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-border/50 shadow-sm"
                style={{ maxHeight: "320px" }}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                This video has been added to your Reels tab automatically.
              </p>
            </div>
          )}

          {jobStatus === "failed" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive">Generation failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try a different description or check again in a moment. Veo may be busy.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs gap-1"
                  onClick={() => { setJobStatus("idle"); setJobId(null); }}
                >
                  <RefreshCw className="h-3 w-3" /> Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past generated videos */}
      {pastVideos.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4 text-accent" />
              Your AI-Generated Videos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastVideos.map((v: any) => (
              <div key={v.id} className="rounded-xl border border-border/50 overflow-hidden">
                {v.status === "complete" && v.video_url ? (
                  <video
                    src={v.video_url}
                    controls
                    className="w-full"
                    style={{ maxHeight: "200px" }}
                  />
                ) : (
                  <div className="h-16 bg-muted/40 flex items-center justify-center gap-2">
                    {v.status === "processing"
                      ? <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Generating…</span></>
                      : <><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-xs text-destructive">Failed</span></>
                    }
                  </div>
                )}
                {v.prompt && (
                  <div className="px-3 py-2 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{v.prompt}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Powered by Google Veo 3.1 · Generated videos are added to your Reels automatically.
        Each generation uses approximately 5 seconds of AI compute.
      </p>
    </div>
  );
}
