/**
 * CampusSpotlight.tsx
 * ===================
 * Homepage featured vendor section — showcases top-performing student brands.
 * Auto-fetches the top 6 vendors by trust score signals (verified + upgraded + rating).
 *
 * FILE PLACEMENT:
 *   src/components/landing/CampusSpotlight.tsx
 *
 * USAGE in Index.tsx — paste just before the "How It Works" section:
 *   import CampusSpotlight from "@/components/landing/CampusSpotlight";
 *   <CampusSpotlight />
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Star, Crown, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustScoreBadge, computeTrustScore } from "@/components/guarantee/TrustScore";

interface SpotlightVendor {
  id:                       string;
  business_name:            string;
  category:                 string;
  description:              string | null;
  is_verified:              boolean;
  is_store_upgraded:        boolean;
  store_upgrade_expires_at: string | null;
  average_rating:           number | null;
  review_count:             number | null;
  profile_image_url:        string | null;
  school_name:              string | null;
  images?:                  { image_url: string; is_primary: boolean }[];
}

const CampusSpotlight = () => {
  const [vendors, setVendors] = useState<SpotlightVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpotlight = async () => {
      try {
        const { data } = await supabase
          .from("vendors")
          .select(`
            id, business_name, category, description,
            is_verified, is_store_upgraded, store_upgrade_expires_at,
            average_rating, review_count, profile_image_url,
            schools(name),
            vendor_images(image_url, is_primary)
          `)
          .eq("is_approved", true)
          .eq("is_verified", true)
          .order("average_rating", { ascending: false })
          .limit(6);

        if (data) {
          setVendors(
            data.map((v: any) => ({
              ...v,
              school_name: v.schools?.name ?? null,
              images:      v.vendor_images ?? [],
            }))
          );
        }
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchSpotlight();
  }, []);

  if (loading) return null;
  if (vendors.length < 2) return null;

  const [featured, ...rest] = vendors;

  return (
    <section className="py-16 px-4 overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Campus Spotlight</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
              Top student brands<br />
              <span className="text-muted-foreground font-normal text-xl">on your campus right now</span>
            </h2>
          </div>
          <Link to="/browse" className="hidden sm:flex">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Grid — featured hero card + 5 smaller */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Hero card (first vendor) ── */}
          <Link
            to={`/vendor/${featured.id}`}
            className="md:col-span-2 md:row-span-2 group relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="relative aspect-[16/9] md:aspect-auto md:h-full min-h-[220px] bg-gradient-to-br from-primary/10 to-accent/10">
              {/* Cover image */}
              {featured.images?.[0]?.image_url ? (
                <img
                  src={featured.images.find(i => i.is_primary)?.image_url ?? featured.images[0].image_url}
                  alt={featured.business_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🏪</div>
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Spotlight crown badge */}
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-accent text-accent-foreground shadow-md">
                  <Crown className="w-3 h-3" /> Campus Spotlight
                </span>
              </div>

              {/* Trust score top-right */}
              <div className="absolute top-3 right-3">
                <TrustScoreBadge
                  score={computeTrustScore(featured)}
                  size="sm"
                />
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  {featured.profile_image_url ? (
                    <img src={featured.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                      {featured.business_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">{featured.business_name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60 text-xs">{featured.category}</span>
                      {featured.is_verified && <ShieldCheck className="w-3 h-3 text-blue-300" />}
                    </div>
                  </div>
                </div>
                {featured.description && (
                  <p className="text-white/70 text-xs line-clamp-2 leading-relaxed">{featured.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {featured.average_rating && featured.average_rating > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400 text-xs font-semibold">
                      <Star className="w-3 h-3 fill-current" /> {featured.average_rating.toFixed(1)}
                    </span>
                  )}
                  {featured.school_name && (
                    <span className="text-white/50 text-xs">🎓 {featured.school_name}</span>
                  )}
                  <span className="ml-auto text-white/60 text-xs group-hover:text-white transition-colors flex items-center gap-1">
                    Visit store <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* ── Smaller cards ── */}
          {rest.slice(0, 4).map((vendor) => {
            const coverImg = vendor.images?.find(i => i.is_primary)?.image_url ?? vendor.images?.[0]?.image_url;
            const score    = computeTrustScore(vendor);
            return (
              <Link
                key={vendor.id}
                to={`/vendor/${vendor.id}`}
                className="group relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={vendor.business_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🏪</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Trust score */}
                  <div className="absolute top-2 right-2">
                    <TrustScoreBadge score={score} size="xs" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h4 className="font-semibold text-sm text-foreground truncate flex-1">{vendor.business_name}</h4>
                    {vendor.is_verified && <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{vendor.category}</span>
                    {vendor.average_rating && vendor.average_rating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500 text-[10px] font-semibold">
                        <Star className="w-2.5 h-2.5 fill-current" /> {vendor.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile "see all" */}
        <div className="mt-5 flex justify-center sm:hidden">
          <Link to="/browse">
            <Button variant="outline" size="sm" className="gap-1.5">
              Browse all vendors <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CampusSpotlight;
