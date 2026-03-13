import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, ShoppingBag, Volume2, VolumeX, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

const Reels = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReels = async () => {
      // Get vendors with reels enabled and their videos
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

  const goNext = () => {
    if (currentIndex < reels.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, reels.length]);

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

  return (
    <div className="min-h-screen bg-foreground">
      <Navbar />
      <div className="fixed inset-0 pt-16 flex items-center justify-center" ref={containerRef}>
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
          </div>

          {/* Navigation */}
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
        </div>
      </div>
    </div>
  );
};

export default Reels;
