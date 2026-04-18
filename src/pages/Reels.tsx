import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, ShoppingBag, Volume2, VolumeX, ChevronUp, ChevronDown, Loader2, Share2 } from "lucide-react";

const Reels = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll / swipe state
  const touchStartY = useRef<number | null>(null);
  const wheelCooldown = useRef(false);

  useEffect(() => {
    const fetchReels = async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, business_name, category, vendor_videos(*), vendor_images(*), schools(name)")
        .eq("reels_enabled", true)
        .eq("is_approved", true)
        .eq("is_active", true);

      const reelsData: any[] = [];
      data?.forEach((vendor: any) => {
        vendor.vendor_videos?.forEach((video: any) => {
          reelsData.push({
            ...video,
            vendor,
          });
        });
      });

      setReels(reelsData);
      setIsLoading(false);
    };
    fetchReels();
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, reels.length - 1));
  }, [reels.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Mouse wheel / trackpad scroll navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelCooldown.current) return;

      // deltaY > 0 = scrolling down = next reel
      if (e.deltaY > 30) {
        goNext();
      } else if (e.deltaY < -30) {
        goPrev();
      }

      // Debounce so one scroll = one reel
      wheelCooldown.current = true;
      setTimeout(() => { wheelCooldown.current = false; }, 600);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [goNext, goPrev]);

  // Touch swipe up/down navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    // Swipe up = next reel, swipe down = prev reel
    if (deltaY > 50) {
      goNext();
    } else if (deltaY < -50) {
      goPrev();
    }
    touchStartY.current = null;
  }, [goNext, goPrev]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 text-center px-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Reels Yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Featured businesses with Reels access will have their videos shown here.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/browse">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  const shareReel = async () => {
    const url = `${window.location.origin}/vendor/${currentReel.vendor.id}`;
    const text = `Check out ${currentReel.vendor.business_name} on Campus Market! 🎓`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentReel.vendor.business_name, text, url });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      // toast would need import — alert as fallback
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-foreground">
      <Navbar />
      <div
        className="fixed inset-0 pt-16 flex items-center justify-center"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reel Container */}
        <div className="relative w-full max-w-md h-[calc(100vh-4rem)] bg-foreground">
          {/* Video */}
          <video
            key={currentReel.id}
            src={currentReel.video_url}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={muted}
            playsInline
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />

          {/* Business Info */}
          <div className="absolute bottom-20 left-4 right-16 text-background">
            <Link to={`/vendor/${currentReel.vendor.id}`}>
              <h3 className="font-bold text-lg">{currentReel.vendor.business_name}</h3>
            </Link>
            <div className="flex gap-2 mt-1">
              <Badge className="bg-background/20 text-background border-0 text-xs">
                {currentReel.vendor.category}
              </Badge>
              {currentReel.vendor.schools?.name && (
                <Badge className="bg-background/20 text-background border-0 text-xs">
                  🎓 {currentReel.vendor.schools.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="absolute right-3 bottom-24 flex flex-col gap-4">
            <button
              onClick={() => setMuted(!muted)}
              className="w-10 h-10 rounded-full bg-background/20 backdrop-blur flex items-center justify-center"
            >
              {muted ? (
                <VolumeX className="h-5 w-5 text-background" />
              ) : (
                <Volume2 className="h-5 w-5 text-background" />
              )}
            </button>
            <button
              onClick={shareReel}
              className="w-10 h-10 rounded-full bg-background/20 backdrop-blur flex items-center justify-center"
              title="Share this reel"
            >
              <Share2 className="h-5 w-5 text-background" />
            </button>
          </div>

          {/* Navigation buttons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-background/20 backdrop-blur flex items-center justify-center disabled:opacity-30"
            >
              <ChevronUp className="h-5 w-5 text-background" />
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === reels.length - 1}
              className="w-10 h-10 rounded-full bg-background/20 backdrop-blur flex items-center justify-center disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5 text-background" />
            </button>
          </div>

          {/* Counter */}
          <div className="absolute top-4 right-4">
            <span className="text-background/70 text-sm">
              {currentIndex + 1} / {reels.length}
            </span>
          </div>

          {/* Scroll hint — mobile only, fades after first interaction */}
          {reels.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden pointer-events-none">
              <p className="text-background/40 text-xs animate-pulse select-none">Swipe up for next reel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reels;
