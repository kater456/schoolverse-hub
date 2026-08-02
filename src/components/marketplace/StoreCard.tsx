import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle, Star, ShieldCheck, Store, ArrowRight } from "lucide-react";
import type { Vendor } from "@/hooks/useVendors";
import { TrustScoreBadge, computeTrustScore } from "@/components/guarantee/TrustScore";

interface StoreCardProps {
  vendor: Vendor & {
    is_vendor_of_week?: boolean;
    vendor_of_week_expires_at?: string | null;
    reels_enabled?: boolean;
    promoted_until?: string | null;
    live_location_on?: boolean;
  };
  index?: number;
  /** "grid" = full card, "rail" = compact side-rail row */
  variant?: "grid" | "rail";
}

const StoreCard = ({ vendor, index = 0, variant = "grid" }: StoreCardProps) => {
  const primaryImage = vendor.images?.find((img) => img.is_primary) || vendor.images?.[0];
  const cardRef      = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const isLive = !!(vendor as any).live_location_on;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 0.45s ease ${index * 0.06}s, transform 0.45s ease ${index * 0.06}s`,
      }}
      className="h-full"
    >
      <Link to={`/store/${vendor.id}`}>
        <div
          className="group relative h-full rounded-2xl overflow-hidden border bg-gradient-to-b from-purple-500/10 via-card to-card border-purple-500/30 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 ring-1 ring-purple-500/15"
        >
          {/* Sparkle Glow Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10" />

          {/* Premium Store Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-full px-2.5 py-1 text-[10px] font-bold shadow-lg shadow-purple-500/30 border border-white/20">
            <Store className="h-3 w-3 animate-pulse" />
            STORE
          </div>

          {/* Image */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt={vendor.business_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-muted">
                <span className="text-4xl">🏪</span>
              </div>
            )}

            {/* Premium Purple Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

            {/* Live location dot */}
            {isLive && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-500 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-md shadow-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </div>
            )}

            {/* Store Category Tag on Card Image */}
            <Badge variant="secondary" className="absolute bottom-3 right-3 text-[10px] font-semibold px-2.5 py-0.5 bg-purple-950/80 hover:bg-purple-950/80 text-purple-100 backdrop-blur-md border border-purple-500/30">
              🏷️ {vendor.category}
            </Badge>
          </div>

          {/* Card body */}
          <div className="p-4 flex flex-col justify-between h-[calc(100%-aspect-[4/3])]">
            <div>
              {/* Name + verified */}
              <div className="flex items-center gap-2 mb-1.5">
                {(vendor as any).profile_image_url ? (
                  <img src={(vendor as any).profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-purple-400" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border-2 border-purple-400">
                    {vendor.business_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <h3 className="font-bold text-foreground group-hover:text-purple-600 transition-colors truncate flex-1 text-base leading-tight">
                  {vendor.business_name}
                </h3>

                {(vendor as any).is_verified && (
                  <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                )}
              </div>

              {vendor.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                  {vendor.description}
                </p>
              )}
            </div>

            <div className="space-y-2.5 mt-auto">
              {/* Trust score badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-purple-500/10">
                <TrustScoreBadge score={computeTrustScore(vendor)} size="xs" />
                <span className="text-[10px] font-semibold text-purple-500 flex items-center gap-1 hover:underline">
                  Visit Store <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>

              {/* School + Location */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                {vendor.school_name && (
                  <span className="flex items-center gap-0.5 font-medium text-purple-700/80 dark:text-purple-400/80">🎓 {vendor.school_name}</span>
                )}
                {vendor.campus_location_name && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                    {vendor.campus_location_name}
                  </span>
                )}
              </div>

              {/* Call / WhatsApp CTAs */}
              {vendor.contact_number && (
                <div className="flex items-center gap-1.5 pt-1.5">
                  <a
                    href={`tel:${vendor.contact_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold bg-muted hover:bg-muted/80 text-foreground rounded-lg py-2 transition-colors border border-border/40"
                    aria-label={`Call ${vendor.business_name}`}
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                  {vendor.messaging_enabled && (
                    <a
                      href={`https://wa.me/${vendor.contact_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! I saw ${vendor.business_name} on Campus Market 🛍️ and I'd like to browse your official store.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg py-2 transition-colors border border-emerald-500/20"
                      aria-label={`WhatsApp ${vendor.business_name}`}
                    >
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default StoreCard;
