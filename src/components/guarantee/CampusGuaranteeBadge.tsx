/**
 * CampusGuaranteeBadge.tsx
 * ========================
 * Trust layer UI for Campus Market.
 *
 * IMPORTANT: Campus Market does NOT process, hold, or mediate payments.
 * All transactions happen directly between buyer and vendor.
 * The Campus Guarantee is a vendor accountability programme only:
 * vendors with poor reviews or repeated complaints are removed from the platform.
 *
 * EXPORTS:
 *   CampusGuaranteeBadge   — small inline badge for vendor cards & profile headers
 *   CampusGuaranteeBanner  — full-width cart/checkout trust section
 *   CampusGuaranteeSheet   — standalone trigger (button or text link)
 *   GuaranteeFundTicker    — community accountability stats display
 */

import {
  ShieldCheck, BadgeCheck, Info, ChevronRight,
  Flag, UserX, Star, Eye,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Deep Explainer Modal (shared by all triggers)
// ─────────────────────────────────────────────────────────────────────────────
function GuaranteeModal() {
  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 gap-0 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div
        className="relative px-6 pt-7 pb-10 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 55%, #1d4ed8 100%)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent)" }}
        />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold mb-1">Campus Guarantee</DialogTitle>
          </DialogHeader>
          <p className="text-blue-100 text-sm leading-relaxed">
            We don't take a cut and we don't handle your money. What we guarantee is accountability —
            vendors with poor reviews or repeated complaints are removed from Campus Market.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5 bg-background">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            How it works
          </p>
          <div className="space-y-3.5">
            {[
              {
                icon: BadgeCheck,
                color: "bg-blue-50 text-blue-600",
                title: "Vendors are verified before listing",
                desc: "Every vendor submits ID and business details, reviewed manually by a campus admin before their store goes live.",
              },
              {
                icon: Flag,
                color: "bg-amber-50 text-amber-600",
                title: "Anyone can report a vendor",
                desc: "Had a bad experience? Report the vendor from their profile. Reports go straight to your campus admin for review.",
              },
              {
                icon: UserX,
                color: "bg-red-50 text-red-600",
                title: "Bad actors get removed",
                desc: "Vendors with consistently poor ratings or repeated complaints are flagged, suspended, and removed from the platform.",
              },
              {
                icon: Star,
                color: "bg-purple-50 text-purple-600",
                title: "Ratings are public and honest",
                desc: "Reviews come from real buyers and stay visible on the vendor's profile — so reputation is earned, not bought.",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage table */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
            What the guarantee means
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3">
            {[
              ["Vendor identity verified",     true ],
              ["Complaints reviewed by admin", true ],
              ["Repeat offenders removed",     true ],
              ["Public, honest ratings",       true ],
              ["We hold or escrow payments",   false],
              ["We refund or mediate disputes",false],
            ].map(([label, covered]) => (
              <div key={label as string} className="flex items-center gap-1.5">
                {covered
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  : <AlertCircle  className="w-3.5 h-3.5 text-red-400   flex-shrink-0" />}
                <span className={`text-xs ${covered ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Campus Market is a listing and discovery platform. Payments and delivery are arranged directly
          between you and the vendor — we are not a party to the transaction and do not process, hold, or
          refund funds. Always meet in a safe campus spot and confirm the item before paying.
        </p>
      </div>
    </DialogContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Small inline badge — vendor cards & profile headers
// ─────────────────────────────────────────────────────────────────────────────
export function CampusGuaranteeBadge({ size = "sm" }: { size?: "sm" | "xs" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-green-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
          <ShieldCheck className={`text-green-600 flex-shrink-0 ${size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
          <span className={`font-semibold text-green-700 ${size === "xs" ? "text-[9px]" : "text-[10px]"}`}>
            Campus Guarantee
          </span>
          <Info className={`text-green-400 opacity-0 group-hover:opacity-100 transition-opacity ${size === "xs" ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
        </button>
      </DialogTrigger>
      <GuaranteeModal />
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cart / Checkout banner
// ─────────────────────────────────────────────────────────────────────────────
export function CampusGuaranteeBanner(_props: { total?: number } = {}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-left group">
          <div className="rounded-xl border border-green-200/80 bg-gradient-to-r from-green-50 to-emerald-50/60 p-3.5 hover:border-green-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-green-800">Campus Guarantee</p>
                  <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                </div>
                <p className="text-xs text-green-700/80 leading-snug">
                  Vendors here are verified, and those with poor reviews or complaints get removed.
                  You pay the vendor directly — Campus Market takes no cut.
                </p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Verified Vendors", "Report & Review", "Repeat Offenders Removed"].map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center text-[9px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5"
                    >
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-green-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
            </div>
          </div>
        </button>
      </DialogTrigger>
      <GuaranteeModal />
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Standalone trigger — button or text link variant
// ─────────────────────────────────────────────────────────────────────────────
export function CampusGuaranteeSheet({ variant = "link" }: { variant?: "link" | "button" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
          >
            <ShieldCheck className="w-4 h-4" />
            Vendor Accountability
          </Button>
        ) : (
          <button className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline underline-offset-2 transition-colors">
            <ShieldCheck className="w-3 h-3" />
            Campus Guarantee
          </button>
        )}
      </DialogTrigger>
      <GuaranteeModal />
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Accountability stats — homepage or admin panel
// ─────────────────────────────────────────────────────────────────────────────
export function GuaranteeFundTicker({
  verifiedVendors  = 0,
  reportsReviewed  = 0,
  vendorsRemoved   = 0,
}: {
  verifiedVendors?: number;
  reportsReviewed?: number;
  vendorsRemoved?:  number;
}) {
  return (
    <div
      className="rounded-2xl p-5 text-white relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}
    >
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.2), transparent)" }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-semibold text-emerald-200 uppercase tracking-widest">
            Campus Guarantee
          </span>
        </div>

        <p className="text-3xl font-bold mb-0.5 tabular-nums">{verifiedVendors.toLocaleString()}</p>
        <p className="text-emerald-200 text-xs mb-4">Verified vendors on campus</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Flag,  label: "Reports reviewed", value: reportsReviewed.toLocaleString() },
            { icon: UserX, label: "Vendors removed",  value: vendorsRemoved.toLocaleString()  },
            { icon: Eye,   label: "Public reviews",   value: "Always on"                      },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-white/10 rounded-xl py-2.5 px-1.5">
              <p className="text-lg font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-emerald-200 leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
