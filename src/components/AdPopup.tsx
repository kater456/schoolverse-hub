import { useState, useEffect } from "react";
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

// ── Banner Ad (top strip) ──────────────────────────────────────────────────────
const BannerAd = ({ ad, onClose, onLinkClick }: { ad: any; onClose: () => void; onLinkClick: () => void }) => (
  <div className="fixed top-16 left-0 right-0 z-[90] animate-in slide-in-from-top-2 duration-300">
    <div className="bg-accent/95 backdrop-blur text-accent-foreground px-4 py-2.5 flex items-center gap-3 shadow-md">
      {ad.image_url && (
        <img src={ad.image_url} alt="" className="h-8 w-12 object-cover rounded shrink-0 hidden sm:block" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold truncate block sm:inline">{ad.title}</span>
        {ad.advertiser_name && (
          <span className="text-[10px] opacity-70 ml-2 hidden sm:inline">by {ad.advertiser_name}</span>
        )}
      </div>
      {ad.link_url && (
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="text-xs font-semibold underline hover:no-underline shrink-0"
        >
          Learn More →
        </a>
      )}
      <button onClick={onClose} className="w-6 h-6 rounded-full bg-accent-foreground/20 flex items-center justify-center shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

// ── Main AdPopup ───────────────────────────────────────────────────────────────
const AdPopup = () => {
  const { user } = useAuth();
  const [popupAds,     setPopupAds]     = useState<any[]>([]);
  const [bannerAds,    setBannerAds]    = useState<any[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [visible,      setVisible]      = useState(false);
  const [bannerVisible,setBannerVisible]= useState(false);
  const [countdown,    setCountdown]    = useState(0);
  const [showDetail,   setShowDetail]   = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);

  // Get user's school for targeting
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.school_id) setUserSchoolId(data.school_id); });
  }, [user]);

  // Fetch ads — FIX: removed overly aggressive session gate.
  // Now uses a per-page-load flag so ads show on every fresh page load,
  // but only once per page (not on every re-render).
  useEffect(() => {
    // Only suppress if already shown in this page load (not across all sessions)
    const shownThisLoad = (window as any).__adsShownThisLoad;
    if (shownThisLoad) return;

    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("platform_ads")
        .select("*")
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false }) as any;

      if (!data || data.length === 0) return;

      // Filter by school targeting
      const eligible = data.filter((ad: any) => {
        if (ad.target_type === "all") return true;
        if (ad.target_type === "schools" && userSchoolId) {
          return (ad.school_ids || []).includes(userSchoolId);
        }
        return ad.target_type === "all";
      });

      if (eligible.length === 0) return;

      // Separate popup and banner ads
      const popups  = eligible.filter((a: any) => a.display_position === "popup"  || a.display_position === "both");
      const banners = eligible.filter((a: any) => a.display_position === "banner" || a.display_position === "both");

      if (popups.length > 0) {
        setPopupAds(popups);
        setCurrentIdx(0);
        setCountdown(30);
        setVisible(true);
        trackView(popups[0]);
      }

      if (banners.length > 0) {
        setBannerAds(banners);
        setBannerVisible(true);
        trackView(banners[0]);
      }

      (window as any).__adsShownThisLoad = true;
    };

    // Delay so page loads first
    const timer = setTimeout(fetchAds, 2500);
    return () => clearTimeout(timer);
  }, [userSchoolId]);

  // Countdown for popup
  useEffect(() => {
    if (!visible || countdown <= 0 || showDetail) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (currentIdx < popupAds.length - 1) {
            const next = currentIdx + 1;
            setCurrentIdx(next);
            setCountdown(30);
            trackView(popupAds[next]);
          } else {
            setVisible(false);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, countdown, showDetail, currentIdx, popupAds]);

  const trackView = async (ad: any) => {
    if (!ad) return;
    await supabase.from("platform_ads").update({ view_count: (ad.view_count || 0) + 1 } as any).eq("id", ad.id);
    try {
      await (supabase as any).from("ad_events").insert({
        ad_id: ad.id, event_type: "view",
        school_id: userSchoolId || null, user_id: user?.id || null,
      } as any);
    } catch (_) {}
  };

  const trackClick = async (ad: any) => {
    if (!ad) return;
    await supabase.from("platform_ads").update({ click_count: (ad.click_count || 0) + 1 } as any).eq("id", ad.id);
    try {
      await (supabase as any).from("ad_events").insert({
        ad_id: ad.id, event_type: "click",
        school_id: userSchoolId || null, user_id: user?.id || null,
      } as any);
    } catch (_) {}
  };

  const handleAdClick = (ad: any) => { trackClick(ad); setShowDetail(true); };

  const goNext = () => {
    if (currentIdx < popupAds.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setCountdown(30);
      trackView(popupAds[next]);
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

  const ad = popupAds[currentIdx];

  return (
    <>
      {/* ── Banner Ad ── */}
      {bannerVisible && bannerAds.length > 0 && (
        <BannerAd
          ad={bannerAds[0]}
          onClose={() => setBannerVisible(false)}
          onLinkClick={() => trackClick(bannerAds[0])}
        />
      )}

      {/* ── Popup Ad ── */}
      {visible && ad && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
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
                      stroke="hsl(var(--accent))" strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 11}`}
                      strokeDashoffset={`${2 * Math.PI * 11 * (1 - countdown / 30)}`}
                      strokeLinecap="round" className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">{countdown}</span>
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
                {popupAds.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all ${
                    i === currentIdx ? "w-4 h-1.5 bg-accent" : "w-1.5 h-1.5 bg-border"
                  }`} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {popupAds.length > 1 && currentIdx > 0 && (
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
                  {currentIdx < popupAds.length - 1 ? "Next →" : ad.link_url ? "Visit →" : "Details →"}
                </button>
                {popupAds.length > 1 && currentIdx < popupAds.length - 1 && (
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
      )}

      {/* Detail modal */}
      {showDetail && ad && (
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
