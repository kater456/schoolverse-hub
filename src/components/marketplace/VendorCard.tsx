import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, ShieldCheck, Trophy, Play } from "lucide-react";
import type { Vendor } from "@/hooks/useVendors";

interface VendorCardProps {
  vendor: Vendor & {
    is_vendor_of_week?: boolean;
    vendor_of_week_expires_at?: string | null;
    reels_enabled?: boolean;
    promoted_until?: string | null;
  };
  index?: number;
}

const VendorCard = ({ vendor, index = 0 }: VendorCardProps) => {
  const primaryImage = vendor.images?.find((img) => img.is_primary) || vendor.images?.[0];
  const cardRef      = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const isVotw = vendor.is_vendor_of_week &&
    vendor.vendor_of_week_expires_at &&
    new Date(vendor.vendor_of_week_expires_at) > new Date();

  const hasReels = !!(vendor as any).reels_enabled &&
    !!(vendor as any).promoted_until &&
    new Date((vendor as any).promoted_until) > new Date();

  // Intersection Observer for fade-in / fade-out on scroll
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.45s ease ${index * 0.06}s, transform 0.45s ease ${index * 0.06}s`,
      }}
    >
      <Link to={`/vendor/${vendor.id}`}>
        <div
          className={`
            group relative rounded-2xl overflow-hidden border bg-card
            hover:shadow-xl hover:-translate-y-1 transition-all duration-300
            ${isVotw
              ? "border-yellow-400/50 shadow-md shadow-yellow-400/10 ring-1 ring-yellow-400/30"
              : "border-border/50 hover:border-accent/40"
            }
          `}
        >
          {/* VOTW glow bar */}
          {isVotw && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 z-10" />
          )}

          {/* Image */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt={vendor.business_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-muted">
                <span className="text-4xl">🏪</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Top-left badge */}
            {isVotw ? (
              <Badge className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 border-0 shadow font-semibold text-[10px] px-2">
                <Trophy className="h-2.5 w-2.5 mr-1 fill-current" />Vendor of Week
              </Badge>
            ) : vendor.is_featured ? (
              <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-0 text-[10px] px-2">
                <Star className="h-2.5 w-2.5 mr-1 fill-current" />Featured
              </Badge>
            ) : null}

            {/* Reels badge */}
            {hasReels && (
              <Badge className="absolute top-2 right-2 bg-black/70 text-white border-0 text-[10px] px-2 backdrop-blur-sm">
                <Play className="h-2.5 w-2.5 mr-1 fill-current" />Reels
              </Badge>
            )}

            {/* Category — bottom right */}
            {!hasReels && (
              <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px] px-2 bg-background/80 backdrop-blur-sm">
                {vendor.category}
              </Badge>
            )}
          </div>

          {/* Card body */}
          <div className="p-3">
            {/* Name + verified */}
            <div className="flex items-center gap-1.5 mb-0.5">
              {/* Reels ring around profile initial */}
              {hasReels ? (
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent via-primary to-pink-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                      {(vendor as any).profile_image_url ? (
                        <img src={(vendor as any).profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-[10px] font-bold text-accent">
                          {vendor.business_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (vendor as any).profile_image_url ? (
                <img src={(vendor as any).profile_image_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-border" />
              ) : null}

              <h3 className="font-semibold text-foreground truncate flex-1 text-sm leading-tight">
                {vendor.business_name}
              </h3>

              {(vendor as any).is_verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </div>

            {/* Category pill */}
            <span className="inline-block text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full mb-1.5">
              {vendor.category}
            </span>

            {vendor.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {vendor.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
              {vendor.school_name && (
                <span className="flex items-center gap-0.5">🎓 {vendor.school_name}</span>
              )}
              {vendor.campus_location_name && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {vendor.campus_location_name}
                </span>
              )}
            </div>

            {vendor.contact_number && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                <Phone className="h-2.5 w-2.5" />
                {vendor.contact_number}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default VendorCard;
