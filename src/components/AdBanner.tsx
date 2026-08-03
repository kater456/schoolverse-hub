import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink, Megaphone } from "lucide-react";

/**
 * AdBanner — renders active platform ads assigned to the "banner" (or "both")
 * placement inline in the page. Previously banner ads were saved by admins but
 * never rendered anywhere, so they silently never appeared.
 *
 * Honours: is_active, starts_at / ends_at window, priority order, school targeting.
 */
const AdBanner = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.school_id) setSchoolId(data.school_id); });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("platform_ads")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error || !data || cancelled) return;

      const eligible = data.filter((ad: any) => {
        const pos = ad.display_position;
        const posOk = pos === "banner" || pos === "both";
        if (!posOk) return false;
        if (!ad.target_type || ad.target_type === "all") return true;
        if (ad.target_type === "schools" && schoolId) {
          return (ad.school_ids || []).includes(schoolId);
        }
        return false;
      });

      setAds(eligible);
      if (eligible[0]) {
        (supabase as any).rpc("increment_ad_metric", {
          _ad_id: eligible[0].id, _metric: "view_count",
        }).then(() => {}, () => {});
      }
    };

    load();
    return () => { cancelled = true; };
  }, [schoolId]);

  // Rotate through multiple banners
  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 8000);
    return () => clearInterval(t);
  }, [ads.length]);

  const ad = ads[idx];
  if (!ad) return null;

  const onClick = () => {
    (supabase as any).rpc("increment_ad_metric", {
      _ad_id: ad.id, _metric: "click_count",
    }).then(() => {}, () => {});
  };

  const Inner = (
    <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card/80 p-3 sm:p-4 shadow-sm transition-colors hover:border-primary/40">
      {ad.image_url ? (
        <img
          src={ad.image_url}
          alt={ad.title}
          loading="lazy"
          className="h-14 w-20 sm:h-16 sm:w-28 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {ad.advertiser_name || "Sponsored"}
        </p>
        <p className="truncate text-sm font-bold text-foreground">{ad.title}</p>
        {ad.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{ad.description}</p>
        )}
      </div>
      {ad.link_url && (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className={className}>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
          {Inner}
        </a>
      ) : Inner}
    </div>
  );
};

export default AdBanner;
