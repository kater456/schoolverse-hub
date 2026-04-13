import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, ExternalLink, ChevronLeft, ChevronRight, Globe, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Ad Detail Modal ────────────────────────────────────────────────────────────
const AdDetailModal = ({
  ad, onClose, onLinkClick,
}: { ad: any; onClose: () => void; onLinkClick: () => void }) => (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <div
      className="relative w-full max-w-lg bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {ad.image_url && (
        <div className="aspect-video bg-muted">
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-5 space-y-3">
        {ad.advertiser_name && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{ad.advertiser_name}</p>
        )}
        <h2 className="text-lg font-bold text-foreground">{ad.title}</h2>
        {ad.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{ad.description}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs">
            {ad.target_type === "all"
              ? <><Globe className="h-3 w-3 mr-1" />Platform-wide</>
              : <><GraduationCap className="h-3 w-3 mr-1" />Campus Ad</>}
          </Badge>
        </div>
        {ad.link_url && (
          <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={onLinkClick} className="block w-full">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11">
              <ExternalLink className="h-4 w-4 mr-2" /> Learn More
            </Button>
          </a>
        )}
      </div>
    </div>
  </div>
);

// ── Main AdPopup ───────────────────────────────────────────────────────────────
const AdPopup = () => {
  const { user } = useAuth();
  const [ads,          setAds]          = useState<any[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [visible,      setVisible]      = useState(false);
  const [countdown,    setCountdown]    = useState(0);
  const [showDetail,   setShowDetail]   = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);

  // Per-mount ref — shows once per page load, not locked across sessions
  const hasShown = useRef(false);

  // Get user's school for targeting
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.school_id) setUserSchoolId(data.school_id);
      });
  }, [user]);

  // Fetch ads — runs after school ID is known (or immediately for non-logged-in users)
  useEffect(() => {
    if (hasShown.current) return;

    const fetchAds = async () => {
      const now = new Date().toISOString();

      // SELECT * — works whether or not the new columns exist yet
      const { data, error } = await (supabase as any)
        .from("platform_ads")
        .select("*")
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[AdPopup] fetch error:", error.message);
        return;
      }

      if (!data || data.length === 0) return;

      // Filter by display_position — tolerates missing column (old schema)
      const popupAds = data.filter((ad: any) => {
        const pos = ad.display_position;
        if (pos === undefined || pos === null) return true; // old schema: show all
        return pos === "popup" || pos === "both";
      });

      // Filter by school targeting
      const eligible = popupAds.filter((ad: any) => {
        if (!ad.target_type || ad.target_type === "all") return true;
        if (ad.target_type === "schools" && userSchoolId) {
          return (ad.school_ids || []).includes(userSchoolId);
        }
        return ad.target_type === "all";
      });

      if (eligible.length === 0) return;

      hasShown.current = true;
      setAds(eligible);
      setCurrentIdx(0);
      setCountdown(30);
      setVisible(true);
      trackView(eligible[0]);
    };

    const timer = setTimeout(fetchAds, 2500);
    return () => clearTimeout(timer);
  }, [userSchoolId]);

  // Countdown
  useEffect(() => {
    if (!visible || countdown <= 0 || showDetail) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (currentIdx < ads.length - 1) {
            const next = currentIdx + 1;
            setCurrentIdx(next);
            setCountdown(30);
            trackView(ads[next]);
          } else {
            setVisible(false);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, countdown, showDetail, currentIdx, ads]);

  const trackView = async (ad: any) => {
    if (!ad?.id) return;
    try {
      await supabase
        .from("platform_ads")
        .update({ view_count: (ad.view_count || 0) + 1 } as any)
        .eq("id", ad.id);
    } catch (_) {}
  };

  const trackClick = async (ad: any) => {
    if (!ad?.id) return;
    try {
      await supabase
        .from("platform_ads")
        .update({ click_count: (ad.click_count || 0) + 1 } as any)
        .eq("id", ad.id);
    } catch (_) {}
  };

  const handleAdClick = (ad: any) => { trackClick(ad); setShowDetail(true); };

  const goNext = () => {
    if (currentIdx < ads.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setCountdown(30);
      trackView(ads[next]);
    } else {
      setVisible(false);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setCountdown(30);
    }
  };

  if (!visible || ads.length === 0) return null;

  const ad = ads[currentIdx];

  return (
    <>
      {/* ── Popup ── */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
        <div className="relative w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {ad.target_type === "all"
                  ? <><Globe className="h-2.5 w-2.5 mr-0.5" />All campuses</>
                  : <><GraduationCap className="h-2.5 w-2.5 mr-0.5" />Your campus</>}
              </Badge>
              {ad.advertiser_name && (
                <span className="text-[10px] text-muted-foreground">by {ad.advertiser_name}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Countdown ring */}
              <div className="relative w-7 h-7">
                <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="11" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                  <circle
                    cx="14" cy="14" r="11" fill="none"
                    stroke="hsl(var(--accent))"
                    strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 11}`}
                    strokeDashoffset={`${2 * Math.PI * 11 * (1 - countdown / 30)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                  {countdown}
                </span>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="w-7 h-7 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Ad image */}
          <div
            className="aspect-video bg-muted cursor-pointer relative group"
            onClick={() => handleAdClick(ad)}
          >
            {ad.image_url ? (
              <>
                <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-4 py-1.5 text-xs font-medium text-foreground">
                    Tap to view more
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
                Advertisement
              </div>
            )}
          </div>

          {/* Ad info */}
          <div className="px-4 py-3">
            <p
              className="font-semibold text-sm text-foreground cursor-pointer hover:text-accent transition-colors line-clamp-1"
              onClick={() => handleAdClick(ad)}
            >
              {ad.title}
            </p>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.description}</p>
            )}
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1.5">
              {ads.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${
                  i === currentIdx ? "w-4 h-1.5 bg-accent" : "w-1.5 h-1.5 bg-border"
                }`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {ads.length > 1 && currentIdx > 0 && (
                <button onClick={goPrev} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => {
                  if (ad.link_url) { trackClick(ad); window.open(ad.link_url, "_blank"); }
                  else handleAdClick(ad);
                }}
                className="text-xs text-accent font-medium hover:underline"
              >
                {currentIdx < ads.length - 1 ? "Next →" : ad.link_url ? "Visit →" : "Details →"}
              </button>
              {ads.length > 1 && currentIdx < ads.length - 1 && (
                <button onClick={goNext} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="text-center pb-2">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">Sponsored</span>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <AdDetailModal
          ad={ad}
          onClose={() => setShowDetail(false)}
          onLinkClick={() => trackClick(ad)}
        />
      )}
    </>
  );
};

export default AdPopup;
