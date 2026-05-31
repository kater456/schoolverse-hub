/**
 * ProFeatureGate.tsx
 * ==================
 * Wraps any Pro-only section in a cinematic blur overlay.
 * Non-upgraded vendors see the feature blurred behind glass — not hidden.
 * Tapping "Upgrade" triggers the existing Paystack payment flow.
 *
 * FILE PLACEMENT:
 *   src/components/vendor/ProFeatureGate.tsx
 *
 * USAGE:
 *   import ProFeatureGate from "@/components/vendor/ProFeatureGate";
 *
 *   <ProFeatureGate
 *     vendor={vendor}
 *     feature="AI Video Generator"
 *     description="Generate cinematic product videos with Google Veo 3.1 AI"
 *     icon="🎬"
 *     onUpgradeSuccess={(updatedVendor) => setVendor(updatedVendor)}
 *   >
 *     <VendorVideoGenerator vendorId={vendor.id} vendor={vendor} />
 *   </ProFeatureGate>
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Sparkles, Zap, Lock, Loader2, CheckCircle2,
  ArrowRight, Star, ShieldCheck, BarChart3, Users, Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── What a Pro subscription unlocks ─────────────────────────────────────────
const PRO_PERKS = [
  { icon: "🎬", label: "AI Video Generator",   sub: "Veo 3.1 product videos"    },
  { icon: "✨", label: "AI Business Advisor",   sub: "Smart sales insights"       },
  { icon: "👥", label: "Community Access",      sub: "Student network & groups"   },
  { icon: "🏪", label: "Store Designer",        sub: "Custom theme & layout"      },
  { icon: "📊", label: "Analytics Dashboard",   sub: "Revenue & traffic trends"   },
  { icon: "⚡", label: "Priority in Search",    sub: "Featured placement"         },
];

// ─── Paystack shop link (same one used in VendorStoreUpgrade.tsx) ─────────────
const PAYSTACK_UPGRADE_LINK = "https://paystack.shop/pay/7k6qdy068t";
const UPGRADE_PRICE         = "₦2,000/month";

// ─────────────────────────────────────────────────────────────────────────────
// Inline upgrade panel (shown inside the blur gate)
// ─────────────────────────────────────────────────────────────────────────────
function UpgradePanel({
  vendor,
  feature,
  description,
  icon,
  onUpgradeSuccess,
}: {
  vendor:           any;
  feature:          string;
  description:      string;
  icon:             string;
  onUpgradeSuccess: (v: any) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step,          setStep]          = useState<"cta" | "pay" | "confirm" | "done">("cta");
  const [manualRef,     setManualRef]     = useState("");
  const [confirming,    setConfirming]    = useState(false);

  const openPaystack = () => {
    window.open(PAYSTACK_UPGRADE_LINK, "_blank", "noopener,noreferrer");
    setStep("confirm");
  };

  const confirmUpgrade = async () => {
    if (!manualRef.trim()) {
      toast({ title: "Paste your Paystack reference first", variant: "destructive" });
      return;
    }
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("vendor-featured-payment", {
        body: {
          vendor_id:           vendor.id,
          payment_reference:   manualRef.trim(),
          payment_type:        "store_upgrade",
          amount_kobo:         200000, // ₦2,000
        },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      // Refresh vendor record
      const { data: updated } = await supabase
        .from("vendors")
        .select("*, schools(name), campus_locations(name)")
        .eq("id", vendor.id)
        .single();

      toast({ title: "🎉 Store upgraded!", description: "All Pro features are now unlocked." });
      setStep("done");
      if (updated) onUpgradeSuccess(updated);
    } catch (err: any) {
      // Fallback: mark as pending for admin review
      await supabase.from("vendors").update({
        is_store_upgraded:        true,
        store_upgrade_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        upgrade_payment_ref:      manualRef.trim(),
        upgrade_payment_status:   "pending_review",
      } as any).eq("id", vendor.id);

      toast({
        title: "Reference submitted!",
        description: "Your upgrade is being reviewed. Pro features will unlock shortly.",
      });
      setStep("done");
    } finally {
      setConfirming(false);
    }
  };

  if (step === "done") {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="font-bold text-foreground">You're Pro!</p>
        <p className="text-xs text-muted-foreground">Refreshing your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Feature header */}
      <div className="text-center">
        <span className="text-5xl">{icon}</span>
        <h3 className="text-lg font-bold mt-2 text-foreground">{feature}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>

      {/* What you get */}
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-border/50 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-foreground">Everything in Pro — {UPGRADE_PRICE}</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/30">
          {PRO_PERKS.map(({ icon: pIcon, label, sub }) => (
            <div key={label} className="flex items-start gap-2 p-3 bg-background">
              <span className="text-lg mt-0.5">{pIcon}</span>
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {step === "cta" && (
        <>
          <Button
            className="w-full h-12 gap-2 font-bold text-sm shadow-lg"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
            onClick={openPaystack}
          >
            <Crown className="h-4 w-4" />
            Upgrade for {UPGRADE_PRICE}
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            Secure payment via Paystack · 30-day access · Cancel anytime
          </p>
        </>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">✅ Payment window opened</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              After paying on Paystack, copy your transaction reference (starts with "T-" or similar) and paste it below.
            </p>
          </div>
          <Input
            placeholder="Paste your Paystack reference here…"
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={openPaystack}>
              Re-open Payment
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={confirmUpgrade}
              disabled={confirming || !manualRef.trim()}
            >
              {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Upgrade
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProFeatureGate export
// ─────────────────────────────────────────────────────────────────────────────
interface ProFeatureGateProps {
  vendor:           any;
  feature:          string;
  description:      string;
  icon:             string;
  onUpgradeSuccess: (updatedVendor: any) => void;
  children:         React.ReactNode;
}

export default function ProFeatureGate({
  vendor,
  feature,
  description,
  icon,
  onUpgradeSuccess,
  children,
}: ProFeatureGateProps) {
  const isUpgraded =
    vendor?.is_store_upgraded === true &&
    (!vendor?.store_upgrade_expires_at || new Date(vendor.store_upgrade_expires_at) > new Date());

  // Already upgraded — render children directly
  if (isUpgraded) return <>{children}</>;

  // Not upgraded — show blur overlay
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.45 }} aria-hidden="true">
        {children}
      </div>

      {/* Glass overlay */}
      <div className="absolute inset-0 flex items-start justify-center pt-6 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.97) 40%, rgba(255,255,255,1) 100%)" }}>
        <div className="w-full max-w-sm">
          <UpgradePanel
            vendor={vendor}
            feature={feature}
            description={description}
            icon={icon}
            onUpgradeSuccess={onUpgradeSuccess}
          />
        </div>
      </div>
    </div>
  );
}
