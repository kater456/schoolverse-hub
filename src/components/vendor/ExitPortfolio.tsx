/**
 * ExitPortfolio.tsx
 * =================
 * Generates a "Verified Business Portfolio" — a printable/downloadable
 * summary of the vendor's Campus Market history. Ideal for CVs, pitch decks,
 * and post-graduation funding applications.
 *
 * FILE PLACEMENT:
 *   src/components/vendor/ExitPortfolio.tsx
 *
 * USAGE in VendorDashboard.tsx — add inside the Settings tab or a new "Portfolio" tab:
 *   import ExitPortfolio from "@/components/vendor/ExitPortfolio";
 *   <ExitPortfolio vendor={vendor} stats={stats} />
 *
 * EXPORT MECHANISM:
 *   Opens a full-screen print-optimised view, then triggers window.print().
 *   The CSS @media print rules hide the header/navbar and format cleanly for PDF.
 *   No server or extra library needed — works in every browser.
 */

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Download, FileText, Star, ShieldCheck, Crown, TrendingUp,
  Package, MessageSquare, Award, BadgeCheck, Loader2, X,
  Calendar, MapPin, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { computeTrustScore, TrustScoreBadge } from "@/components/guarantee/TrustScore";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortfolioVendor {
  id:                        string;
  business_name:             string;
  category:                  string;
  description:               string | null;
  is_verified:               boolean;
  is_store_upgraded:         boolean;
  store_upgrade_expires_at:  string | null;
  profile_image_url:         string | null;
  contact_number:            string | null;
  social_instagram:          string | null;
  social_twitter:            string | null;
  social_tiktok:             string | null;
  average_rating:            number | null;
  review_count:              number | null;
  created_at?:               string;
  schools?:                  { name: string } | null;
  campus_locations?:         { name: string } | null;
}

interface PortfolioStats {
  totalOrders:    number;
  totalRevenue:   number;
  totalProducts:  number;
  topCategory:    string;
}

interface Testimonial {
  id:         string;
  comment:    string;
  rating:     number;
  created_at: string;
  buyer_name: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// Print-optimised portfolio view
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioDocument({
  vendor,
  stats,
  testimonials,
  onClose,
}: {
  vendor:       PortfolioVendor;
  stats:        PortfolioStats;
  testimonials: Testimonial[];
  onClose:      () => void;
}) {
  const score       = computeTrustScore(vendor);
  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto" id="portfolio-root">
      {/* ── Screen-only controls ── */}
      <div
        className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Business Portfolio Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="gap-2 h-8 text-xs">
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── A4-ish document ── */}
      <div
        className="mx-auto my-8 print:my-0 print:shadow-none shadow-2xl"
        style={{ maxWidth: "794px", background: "#fff" }}
        id="portfolio-print"
      >
        {/* Cover header */}
        <div
          className="relative px-10 pt-10 pb-12 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 55%, #1d4ed8 100%)" }}
        >
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }}
          />
          <div className="relative z-10 flex items-start gap-6">
            {/* Logo/avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {vendor.profile_image_url ? (
                <img src={vendor.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{vendor.business_name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                  Campus Market · Verified Business Portfolio
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">{vendor.business_name}</h1>
              <p className="text-blue-200 text-sm mb-3">{vendor.category}</p>

              <div className="flex flex-wrap gap-2">
                {vendor.is_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 rounded-full px-2.5 py-1 border border-white/20">
                    <ShieldCheck className="w-3 h-3" /> Identity Verified
                  </span>
                )}
                {vendor.is_store_upgraded && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-400/15 rounded-full px-2.5 py-1 border border-amber-400/30">
                    <Crown className="w-3 h-3" /> Pro Vendor
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 rounded-full px-2.5 py-1 border border-white/20">
                  <Award className="w-3 h-3" /> Trust Score: {score.total}/100 · {score.tier.charAt(0).toUpperCase() + score.tier.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-1 text-xs text-blue-200">
            {vendor.schools?.name && <span>🎓 {vendor.schools.name}</span>}
            {vendor.campus_locations?.name && <span>📍 {vendor.campus_locations.name}</span>}
            {vendor.contact_number && <span>📞 {vendor.contact_number}</span>}
            {vendor.created_at && <span>📅 Member since {fmtDate(vendor.created_at)}</span>}
            <span className="ml-auto">Generated {generatedAt}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-10 py-8 space-y-8">
          {/* Business summary */}
          {vendor.description && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">About the Business</h2>
              <p className="text-sm text-foreground leading-relaxed">{vendor.description}</p>
            </div>
          )}

          {/* KPI row */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Performance Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Package,      label: "Total Orders",    value: stats.totalOrders.toLocaleString() },
                { icon: TrendingUp,   label: "Total Revenue",   value: fmt(stats.totalRevenue)            },
                { icon: Star,         label: "Average Rating",  value: vendor.average_rating ? `${vendor.average_rating.toFixed(1)}/5` : "N/A" },
                { icon: MessageSquare,label: "Customer Reviews",value: (vendor.review_count ?? 0).toLocaleString() },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/60 p-4 text-center"
                  style={{ background: "#fafafa" }}
                >
                  <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust breakdown — compact */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Trust Score Breakdown</h2>
            <div className="rounded-xl border border-border/60 overflow-hidden">
              {score.breakdown.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border/40" : ""}`}
                >
                  <span className="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
                  <span className="text-sm text-foreground flex-1">{item.label}</span>
                  <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden mr-2 flex-shrink-0">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.score / item.max) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${item.score === item.max ? "text-green-600" : "text-muted-foreground"}`}>
                    {item.score}/{item.max}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-t border-border/60">
                <span className="text-sm font-bold text-foreground">Overall Trust Score</span>
                <span className="text-base font-bold text-primary">{score.total}/100 · {score.tier.charAt(0).toUpperCase() + score.tier.slice(1)}</span>
              </div>
            </div>
          </div>

          {/* Top testimonials */}
          {testimonials.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Customer Testimonials ({testimonials.length})
              </h2>
              <div className="space-y-3">
                {testimonials.slice(0, 5).map((t) => (
                  <div key={t.id} className="rounded-xl border border-border/60 p-4" style={{ background: "#fafafa" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < t.rating ? "text-amber-400 fill-current" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {t.buyer_name ? t.buyer_name : "Verified Buyer"} · {fmtDate(t.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground italic leading-relaxed">"{t.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {(vendor.social_instagram || vendor.social_twitter || vendor.social_tiktok) && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Social Media Presence</h2>
              <div className="flex flex-wrap gap-2">
                {vendor.social_instagram && (
                  <span className="text-xs px-3 py-1.5 rounded-full border border-pink-200 text-pink-700 bg-pink-50">
                    📸 Instagram: @{vendor.social_instagram}
                  </span>
                )}
                {vendor.social_twitter && (
                  <span className="text-xs px-3 py-1.5 rounded-full border border-sky-200 text-sky-700 bg-sky-50">
                    𝕏 Twitter: @{vendor.social_twitter}
                  </span>
                )}
                {vendor.social_tiktok && (
                  <span className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                    🎵 TikTok: @{vendor.social_tiktok}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer disclaimer */}
          <div
            className="rounded-xl border border-border/60 p-4"
            style={{ background: "#fafafa" }}
          >
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Verified by Campus Market</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  This portfolio was generated by Campus Market and reflects verified transaction data, customer reviews, and identity checks on record as of {generatedAt}.
                  It is intended as supporting documentation for CVs, pitch decks, and funding applications.
                  For verification enquiries, contact: <span className="font-medium">support@campusmarketapp.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles injected into head */}
      <style>{`
        @media print {
          #portfolio-root > div:first-child { display: none !important; }
          body { margin: 0; }
          #portfolio-print { margin: 0; max-width: 100%; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — trigger button + portfolio overlay
// ─────────────────────────────────────────────────────────────────────────────
export default function ExitPortfolio({
  vendor,
  stats,
}: {
  vendor: PortfolioVendor;
  stats:  PortfolioStats;
}) {
  const [open,         setOpen]         = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading,      setLoading]      = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("vendor_testimonials")
        .select("id, comment, rating, created_at, buyer_name")
        .eq("vendor_id", vendor.id)
        .eq("is_approved", true)
        .order("rating", { ascending: false })
        .limit(10);
      setTestimonials((data ?? []) as Testimonial[]);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleOpen = async () => {
    await fetchTestimonials();
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          {loading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <FileText className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Export Business Portfolio</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download a verified PDF summary of your sales, reviews & trust score — perfect for CVs and pitch decks
          </p>
        </div>
        <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </button>

      {open && (
        <PortfolioDocument
          vendor={vendor}
          stats={stats}
          testimonials={testimonials}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}