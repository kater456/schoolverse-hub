/**
 * CampusGuaranteeBadge.tsx
 * ========================
 * Trust layer UI components for Campus Market's buyer protection system.
 *
 * EXPORTS:
 *   CampusGuaranteeBadge   — small inline badge for vendor cards & profile headers
 *   CampusGuaranteeBanner  — full-width cart/checkout protection section
 *   CampusGuaranteeSheet   — standalone trigger (button or text link)
 *   GuaranteeFundTicker    — live pool display for homepage or admin
 *
 * HOW TO USE:
 *
 * 1. VendorProfile.tsx — after the verified badge (line ~533):
 *    import { CampusGuaranteeBadge } from "@/components/guarantee/CampusGuaranteeBadge";
 *    <CampusGuaranteeBadge />
 *
 * 2. CartSheet.tsx — between the totals and the checkout button:
 *    import { CampusGuaranteeBanner } from "@/components/guarantee/CampusGuaranteeBadge";
 *    <CampusGuaranteeBanner total={totalPrice} />
 *
 * 3. Any page — standalone explainer:
 *    import { CampusGuaranteeSheet } from "@/components/guarantee/CampusGuaranteeBadge";
 *    <CampusGuaranteeSheet variant="button" />
 *
 * 4. Homepage or Admin stats section:
 *    import { GuaranteeFundTicker } from "@/components/guarantee/CampusGuaranteeBadge";
 *    <GuaranteeFundTicker totalPoolNaira={245000} totalTransactions={312} claimsResolved={4} />
 */

import { useState } from "react";
import {
  ShieldCheck, BadgeCheck, Info, ChevronRight,
  Lock, RotateCcw, Zap, Star,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// ─── Config ───────────────────────────────────────────────────────────────────
export const GUARANTEE_FEE_PERCENT = 1.5;       // % of each transaction
const GUARANTEE_CAP_NAIRA          = 50_000;    // max payout per claim (₦50k)

// ─── Formatter ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// Deep Explainer Modal (shared by all triggers)
// ─────────────────────────────────────────────────────────────────────────────
function GuaranteeModal() {
  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 gap-0">
      {/* Header */}
      <div
        className="relative px-6 pt-7 pb-10 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 55%, #1d4ed8 100%)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent)" }}
        />
        <div
          className="absolute -bottom-6 left-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.2), transparent)" }}
        />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold mb-1">Campus Guarantee</DialogTitle>
          </DialogHeader>
          <p className="text-blue-100 text-sm leading-relaxed">
            Every transaction contributes {GUARANTEE_FEE_PERCENT}% to a shared Trust Fund that protects buyers and builds vendor credibility across campus.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5 bg-background">
        {/* How it works */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            How it works
          </p>
          <div className="space-y-3.5">
            {[
              {
                icon: Lock,
                color: "bg-blue-50 text-blue-600",
                title: "Funds held securely",
                desc: "Payment is processed by Paystack. Funds clear to the vendor after the buyer confirms delivery or 72 hours pass without a dispute.",
              },
              {
                icon: RotateCcw,
                color: "bg-green-50 text-green-600",
                title: "Instant refund window",
                desc: "If your item doesn't arrive or isn't as described, submit a claim within 48 hours for a full refund from the Trust Fund.",
              },
              {
                icon: Zap,
                color: "bg-amber-50 text-amber-600",
                title: `${GUARANTEE_FEE_PERCENT}% builds the pool`,
                desc: `${fmt(GUARANTEE_FEE_PERCENT / 100 * 5000)} of every ₦5,000 purchase goes into the Campus Guarantee pool — capped at ${fmt(GUARANTEE_CAP_NAIRA)} per claim.`,
              },
              {
                icon: Star,
                color: "bg-purple-50 text-purple-600",
                title: "Vendor Trust Score",
                desc: "Vendors who resolve disputes quickly earn a higher Trust Score, boosting their store visibility and buyer confidence.",
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
            What's covered
          </p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
            {[
              ["Item not delivered",           true ],
              ["Item significantly different", true ],
              ["Vendor no-show",               true ],
              ["Service not rendered",         true ],
              ["Buyer's remorse",              false],
              ["Item used before return",      false],
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
          The Campus Guarantee is a community-run buyer protection programme, not a formal insurance product.
          It is governed by Campus Market's Terms of Service.
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
// 2. Cart / Checkout banner — above the checkout button in CartSheet
// ─────────────────────────────────────────────────────────────────────────────
export function CampusGuaranteeBanner({ total }: { total: number }) {
  const contribution = total * (GUARANTEE_FEE_PERCENT / 100);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-left group">
          <div className="rounded-xl border border-green-200/80 bg-gradient-to-r from-green-50 to-emerald-50/60 p-3.5 hover:border-green-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-start gap-3">
              {/* Shield */}
              <div className="w-9 h-9 rounded-xl bg-green-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-green-800">Campus Guarantee Protected</p>
                  <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                </div>
                <p className="text-xs text-green-700/80 leading-snug">
                  This order is backed by the Campus Guarantee Trust Fund.
                  {total > 0 && (
                    <> <span className="font-semibold text-green-700">{fmt(contribution)}</span>{" "}
                    ({GUARANTEE_FEE_PERCENT}%) supports the pool.</>
                  )}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Delivery Protection", "48h Refund Window", "Dispute Resolution"].map((f) => (
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
            Buyer Protection
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
// 4. Fund pool ticker — homepage hero section or admin panel
// ─────────────────────────────────────────────────────────────────────────────
export function GuaranteeFundTicker({
  totalPoolNaira    = 0,
  totalTransactions = 0,
  claimsResolved    = 0,
}: {
  totalPoolNaira?:    number;
  totalTransactions?: number;
  claimsResolved?:    number;
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
            Campus Guarantee Pool
          </span>
        </div>

        <p className="text-3xl font-bold mb-0.5 tabular-nums">{fmt(totalPoolNaira)}</p>
        <p className="text-emerald-200 text-xs mb-4">Total trust fund balance</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Transactions",     value: totalTransactions.toLocaleString() },
            { label: "Claims resolved",  value: claimsResolved.toString()           },
            { label: "Buyers protected", value: totalTransactions.toLocaleString() },
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
