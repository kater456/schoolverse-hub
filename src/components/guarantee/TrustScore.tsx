/**
 * TrustScore.tsx
 * ==============
 * Vendor trust score system — badge, mini indicator, and full breakdown card.
 *
 * EXPORTS:
 *   computeTrustScore      — pure function, call anywhere
 *   TrustScoreBadge        — coloured pill badge (vendor cards, profile header)
 *   TrustScoreBreakdown    — full card with category breakdown (vendor dashboard)
 *
 * USAGE:
 *
 * 1. VendorCard.tsx — next to the verified checkmark:
 *    import { TrustScoreBadge, computeTrustScore } from "@/components/guarantee/TrustScore";
 *    const score = computeTrustScore(vendor);
 *    <TrustScoreBadge score={score} />
 *
 * 2. VendorProfile.tsx — in the header badge row:
 *    <TrustScoreBadge score={computeTrustScore(vendor)} size="md" />
 *
 * 3. VendorDashboard.tsx — inside the Profile or Store tab:
 *    <TrustScoreBreakdown vendor={vendor} />
 *
 * SCORE FORMULA (out of 100):
 *   30 pts  — is_verified
 *   20 pts  — review_count (max at 20+ reviews)
 *   20 pts  — average_rating (4.5+ = full)
 *   15 pts  — is_store_upgraded (active Pro)
 *   10 pts  — dispute_resolution_rate (no disputes = full)
 *    5 pts  — profile completeness (bio, image, social links)
 */

import { ShieldCheck, Star, TrendingUp, Award, BadgeCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────────────
// Score computation
// ─────────────────────────────────────────────────────────────────────────────
export interface TrustScoreInput {
  is_verified?:             boolean;
  is_store_upgraded?:       boolean;
  store_upgrade_expires_at?: string | null;
  review_count?:            number;
  average_rating?:          number;
  disputes_total?:          number;
  disputes_resolved?:       number;
  description?:             string | null;
  profile_image_url?:       string | null;
  social_instagram?:        string | null;
  social_twitter?:          string | null;
  social_tiktok?:           string | null;
}

export interface TrustScoreBreakdownItem {
  label:   string;
  score:   number;
  max:     number;
  icon:    string;
  detail:  string;
}

export interface TrustScoreResult {
  total:     number;           // 0–100
  tier:      "new" | "rising" | "trusted" | "elite";
  breakdown: TrustScoreBreakdownItem[];
}

export function computeTrustScore(v: TrustScoreInput): TrustScoreResult {
  const breakdown: TrustScoreBreakdownItem[] = [];

  // 30 — verified
  const verifiedPts = v.is_verified ? 30 : 0;
  breakdown.push({
    label:  "Identity Verified",
    score:  verifiedPts,
    max:    30,
    icon:   "🛡️",
    detail: v.is_verified ? "Your identity has been verified by Campus Market" : "Get your store verified to earn trust points",
  });

  // 20 — review count (linear up to 20 reviews)
  const rc       = Math.min(v.review_count ?? 0, 20);
  const reviewPts = Math.round((rc / 20) * 20);
  breakdown.push({
    label:  "Customer Reviews",
    score:  reviewPts,
    max:    20,
    icon:   "⭐",
    detail: `${v.review_count ?? 0} review${(v.review_count ?? 0) === 1 ? "" : "s"} received`,
  });

  // 20 — average rating (4.5 = full, scales from 3.0)
  const rating    = v.average_rating ?? 0;
  const ratingPts = rating >= 4.5 ? 20 : rating >= 3.0 ? Math.round(((rating - 3) / 1.5) * 20) : 0;
  breakdown.push({
    label:  "Average Rating",
    score:  ratingPts,
    max:    20,
    icon:   "🏅",
    detail: rating > 0 ? `${rating.toFixed(1)} / 5.0 stars` : "No ratings yet",
  });

  // 15 — Pro plan active
  const proActive   = (v.is_store_upgraded === true) && (!v.store_upgrade_expires_at || new Date(v.store_upgrade_expires_at) > new Date());
  const proPts      = proActive ? 15 : 0;
  breakdown.push({
    label:  "Pro Vendor",
    score:  proPts,
    max:    15,
    icon:   "👑",
    detail: proActive ? "Active Pro subscription" : "Upgrade to Pro to earn trust points",
  });

  // 10 — dispute resolution
  const total    = v.disputes_total  ?? 0;
  const resolved = v.disputes_resolved ?? 0;
  const dispPts  = total === 0 ? 10 : Math.round((resolved / total) * 10);
  breakdown.push({
    label:  "Dispute Resolution",
    score:  dispPts,
    max:    10,
    icon:   "⚖️",
    detail: total === 0 ? "No disputes — full marks!" : `${resolved} of ${total} disputes resolved`,
  });

  // 5 — profile completeness
  let profileFilled = 0;
  if (v.description)        profileFilled++;
  if (v.profile_image_url)  profileFilled++;
  if (v.social_instagram || v.social_twitter || v.social_tiktok) profileFilled++;
  const profilePts = Math.round((profileFilled / 3) * 5);
  breakdown.push({
    label:  "Profile Completeness",
    score:  profilePts,
    max:    5,
    icon:   "📋",
    detail: `${profileFilled} of 3 sections completed (bio, photo, social)`,
  });

  const total_score = breakdown.reduce((s, b) => s + b.score, 0);
  const tier: TrustScoreResult["tier"] =
    total_score >= 85 ? "elite"   :
    total_score >= 65 ? "trusted" :
    total_score >= 40 ? "rising"  : "new";

  return { total: total_score, tier, breakdown };
}

// ─── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  new:     { label: "New",     color: "bg-gray-100   text-gray-600",   ring: "ring-gray-200",   bar: "bg-gray-400"   },
  rising:  { label: "Rising",  color: "bg-amber-50   text-amber-700",  ring: "ring-amber-200",  bar: "bg-amber-400"  },
  trusted: { label: "Trusted", color: "bg-blue-50    text-blue-700",   ring: "ring-blue-200",   bar: "bg-blue-500"   },
  elite:   { label: "Elite",   color: "bg-emerald-50 text-emerald-700",ring: "ring-emerald-200",bar: "bg-emerald-500" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Badge — use on vendor cards & profile header
// ─────────────────────────────────────────────────────────────────────────────
export function TrustScoreBadge({
  score,
  size = "sm",
}: {
  score: TrustScoreResult;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = TIER_CONFIG[score.tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${cfg.color} ${cfg.ring} ${
        size === "xs" ? "text-[8px] px-1.5 py-0.5" :
        size === "sm" ? "text-[10px] px-2 py-0.5" :
                        "text-xs px-2.5 py-1"
      }`}
    >
      <Award className={size === "xs" ? "w-2 h-2" : size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {score.total} · {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Full breakdown card — vendor dashboard Profile/Store tab
// ─────────────────────────────────────────────────────────────────────────────
export function TrustScoreBreakdown({ vendor }: { vendor: TrustScoreInput & { business_name?: string } }) {
  const score = computeTrustScore(vendor);
  const cfg   = TIER_CONFIG[score.tier];

  return (
    <Card className="overflow-hidden">
      {/* Header bar */}
      <div
        className="relative px-5 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #1d4ed8 100%)" }}
      >
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="relative z-10 flex items-center gap-4">
          {/* Score ring */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={score.tier === "elite" ? "#34d399" : score.tier === "trusted" ? "#60a5fa" : score.tier === "rising" ? "#fbbf24" : "#9ca3af"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(score.total / 100) * 175.9} 175.9`}
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white leading-none">{score.total}</span>
              <span className="text-[9px] text-blue-200">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.label} Vendor
              </span>
            </div>
            <p className="text-white font-bold text-base">{vendor.business_name ?? "Your Store"}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {score.tier === "elite"   ? "Top-rated. Buyers love you!" :
               score.tier === "trusted" ? "Strong trust signals across campus" :
               score.tier === "rising"  ? "Growing — keep completing your profile" :
                                          "Just getting started — verify to unlock points"}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Score breakdown</p>
        {score.breakdown.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </div>
              <span className={`text-xs font-bold ${item.score === item.max ? "text-green-600" : item.score > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                {item.score}/{item.max}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                style={{ width: `${(item.score / item.max) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
          </div>
        ))}

        {score.tier !== "elite" && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">How to improve</p>
                <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                  {!vendor.is_verified && "Get verified to unlock 30 points. "}
                  {(vendor.review_count ?? 0) < 5 && "Ask satisfied customers for reviews. "}
                  {!vendor.is_store_upgraded && "Upgrade to Pro for 15 more points."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}