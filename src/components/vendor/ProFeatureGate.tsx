/**
 * ProFeatureGate.tsx — Updated for recurring subscriptions
 * Gates Pro and Standard features behind the new subscription plans.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Loader2, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPlan, resolvePlan, SUBSCRIPTION_PLAN_CODES } from "@/lib/pricing";

// ── What each plan unlocks ────────────────────────────────────────────────────
const STANDARD_PERKS = [
  { icon: "📦", label: "20 Products",        sub: "List up to 20 items"         },
  { icon: "🎬", label: "2 Video Uploads",    sub: "Manual reel uploads"         },
  { icon: "🔥", label: "Deals Manager",      sub: "Run promos & flash sales"    },
  { icon: "🏪", label: "Basic Store Design", sub: "Custom colours & layout"     },
  { icon: "🎥", label: "Ad Studio",          sub: "Generate product videos"     },
];

const PRO_PERKS = [
  { icon: "📦", label: "Unlimited Products", sub: "No listing cap"              },
  { icon: "🎬", label: "Unlimited Reels",    sub: "Upload as many as you want"  },
  { icon: "✨", label: "AI Advisor",         sub: "Smart sales insights"        },
  { icon: "👥", label: "Community",          sub: "Student vendor network"      },
  { icon: "🏪", label: "Full Store Design",  sub: "Custom theme & banner"       },
  { icon: "⚡", label: "Priority Search",    sub: "Featured placement"          },
  { icon: "🎥", label: "Ad Studio",          sub: "Generate product videos"     },
];

// ── Upgrade panel shown inside the blur gate ──────────────────────────────────
function UpgradePanel({
  vendor, feature, description, icon, requiredPlan, onUpgradeSuccess,
}: {
  vendor: any; feature: string; description: string;
  icon: string; requiredPlan: "standard" | "pro";
  onUpgradeSuccess: (v: any) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const perks = requiredPlan === "pro" ? PRO_PERKS : STANDARD_PERKS;
  const planLabel = requiredPlan === "pro" ? "Pro — ₦3,500/month" : "Standard — ₦1,500/month";
  const planKey = requiredPlan === "pro" ? "subscription_pro" : "subscription_standard";

  const handleSubscribe = async () => {
    if (!user?.email) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }

    // Load Paystack if needed
    if (!(window as any).PaystackPop) {
      setLoading(true);
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.async = true;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    }

    setLoading(true);

    try {
      const plan = await resolvePlan(planKey as any);
      const PaystackPop = (window as any).PaystackPop;
      const ref = `sub_${requiredPlan}_${vendor.id}_${Date.now()}`;

      const handler = PaystackPop.setup({
        key: "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
        email: user.email,
        amount: plan.amountSubunits,
        currency: plan.currency,
        ref,
        plan: SUBSCRIPTION_PLAN_CODES[requiredPlan],
        channels: plan.channels,
        metadata: { vendor_id: vendor.id, plan: requiredPlan },
        onClose: () => {
          setLoading(false);
          toast({ title: "Payment cancelled" });
        },
        callback: async (response: any) => {
          try {
            const { data, error } = await supabase.functions.invoke("verify-subscription", {
              body: {
                reference: response.reference,
                vendor_id: vendor.id,
                plan: requiredPlan,
              },
            });

            if (error || !data?.success) {
              throw new Error(error?.message || data?.error || "Verification failed");
            }

            // Refresh vendor record
            const { data: updated } = await supabase
              .from("vendors")
              .select("*, schools(name), campus_locations(name)")
              .eq("id", vendor.id)
              .single();

            toast({
              title: `🎉 ${requiredPlan === "pro" ? "Pro" : "Standard"} activated!`,
              description: "Your features are now unlocked.",
            });

            setDone(true);
            if (updated) onUpgradeSuccess(updated);
          } catch (err: any) {
            toast({
              title: "Activation failed",
              description: "Payment received. Contact support with ref: " + response.reference,
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
      });

      handler.openIframe();
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    }
  };

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="font-bold text-foreground">
          {requiredPlan === "pro" ? "You're Pro!" : "Standard activated!"}
        </p>
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

      {/* Perks list */}
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-border/50 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-foreground">{planLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/30">
          {perks.map(({ icon: pIcon, label, sub }) => (
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

      <Button
        className="w-full h-12 gap-2 font-bold text-sm shadow-lg"
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
        onClick={handleSubscribe}
        disabled={loading}
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
          : <><Crown className="h-4 w-4" /> Subscribe to {planLabel} <ArrowRight className="h-4 w-4 ml-auto" /></>
        }
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">
        Secure payment via Paystack · Auto-renews monthly · Cancel anytime
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface ProFeatureGateProps {
  vendor: any;
  feature: string;
  description: string;
  icon: string;
  requiredPlan?: "standard" | "pro";
  onUpgradeSuccess: (updatedVendor: any) => void;
  children: React.ReactNode;
}

export default function ProFeatureGate({
  vendor, feature, description, icon,
  requiredPlan = "pro",
  onUpgradeSuccess, children,
}: ProFeatureGateProps) {
  // Check new subscription system first, fall back to legacy is_store_upgraded
  const hasAccess = hasPlan(vendor, requiredPlan) ||
    (requiredPlan === "pro" && vendor?.is_store_upgraded === true &&
      (!vendor?.store_upgrade_expires_at || new Date(vendor.store_upgrade_expires_at) > new Date()));

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(6px)", opacity: 0.45 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Glass overlay */}
      <div
        className="absolute inset-0 flex items-start justify-center pt-6 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.97) 40%, rgba(255,255,255,1) 100%)" }}
      >
        <div className="w-full max-w-sm">
          <UpgradePanel
            vendor={vendor}
            feature={feature}
            description={description}
            icon={icon}
            requiredPlan={requiredPlan}
            onUpgradeSuccess={onUpgradeSuccess}
          />
        </div>
      </div>
    </div>
  );
}
