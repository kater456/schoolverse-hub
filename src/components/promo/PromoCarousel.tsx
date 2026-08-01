import { Link } from "react-router-dom";
import { Flame, Clock, ArrowRight } from "lucide-react";
import { useLiveDeals, dealLabel, timeLeft } from "@/hooks/useLiveDeals";

/**
 * Horizontal scrolling carousel of every live deal on the platform.
 * Renders nothing when there are no live promos.
 */
const PromoCarousel = () => {
  const { deals, isLoading } = useLiveDeals();

  if (isLoading || deals.length === 0) return null;

  return (
    <section className="py-10 px-4 bg-gradient-to-b from-orange-500/5 to-transparent">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Deals &amp; Promos
          </h2>
          <Link
            to="/browse"
            className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
          >
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              to={`/vendor/${deal.vendor_id}`}
              className="snap-start shrink-0 w-[240px] rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-28 bg-muted">
                {deal.image_url ? (
                  <img
                    src={deal.image_url}
                    alt={deal.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-primary/20">
                    <Flame className="h-8 w-8 text-orange-500" />
                  </div>
                )}
                <span className="absolute top-2 left-2 rounded-full bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow">
                  {dealLabel(deal)}
                </span>
              </div>

              <div className="p-3">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{deal.title}</p>
                {deal.vendor_name && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {deal.vendor_name}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {deal.original_price && (
                    <span className="text-[11px] line-through text-muted-foreground">
                      ₦{Number(deal.original_price).toLocaleString()}
                    </span>
                  )}
                  {deal.deal_price && (
                    <span className="text-sm font-bold text-emerald-600">
                      ₦{Number(deal.deal_price).toLocaleString()}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[10px] font-medium text-orange-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeLeft(deal.expires_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoCarousel;
