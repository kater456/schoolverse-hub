import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdPopup = () => {
  const [ad, setAd] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const shown = sessionStorage.getItem("ad_shown");
    if (shown) return;

    const fetchAd = async () => {
      const { data } = await supabase
        .from("platform_ads")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1) as any;

      if (data && data.length > 0) {
        setAd(data[0]);
        setCountdown(data[0].display_duration || 60);
        setVisible(true);
        sessionStorage.setItem("ad_shown", "1");
      }
    };
    const timer = setTimeout(fetchAd, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { setVisible(false); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !ad) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="absolute top-2 left-2 z-10 bg-background/80 text-foreground text-xs px-2 py-1 rounded-full">
          {countdown}s
        </div>

        {ad.media_type === "video" ? (
          <video
            src={ad.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video object-cover"
          />
        ) : (
          <img
            src={ad.media_url}
            alt={ad.title || "Ad"}
            className="w-full aspect-video object-cover"
          />
        )}

        {ad.title && (
          <div className="p-4">
            <p className="text-sm font-semibold text-foreground text-center">{ad.title}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdPopup;
