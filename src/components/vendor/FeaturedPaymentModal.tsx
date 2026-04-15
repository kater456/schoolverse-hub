import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Star, Film, CreditCard, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  vendorId: string; onSuccess: () => void;
}
type PlanType = "top_listing" | "top_listing_reels";

const PLANS: Record<PlanType, { title: string; amountKobo: number; amountDisplay: string; features: string[]; icon: any }> = {
  top_listing: {
    title: "Top Listing", amountKobo: 100000, amountDisplay: "₦1,000",
    features: ["Appear at top of Browse", "7 days duration", "Instant activation"],
    icon: Star,
  },
  top_listing_reels: {
    title: "Top Listing + Reels", amountKobo: 200000, amountDisplay: "₦2,000",
    features: ["Appear at top of Browse", "Upload short video reels", "7 days duration", "Instant activation"],
    icon: Film,
  },
};

const FeaturedPaymentModal = ({ open, onOpenChange, vendorId, onSuccess }: Props) => {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const [paying,   setPaying]  = useState(false);
  const [success,  setSuccess] = useState(false);

  useEffect(() => {
    if (!(window as any).PaystackPop) {
      const s = document.createElement("script");
      s.src   = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const handlePay = (planKey: PlanType) => {
    const plan        = PLANS[planKey];
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) { toast({ title: "Payment system not ready. Try again.", variant: "destructive" }); return; }
    if (!user?.email) { toast({ title: "Sign in first", variant: "destructive" }); return; }

    setPaying(true);
    const reference = `feat_${vendorId}_${Date.now()}`;

    PaystackPop.setup({
      key:      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email:    user.email,
      amount:   plan.amountKobo,
      currency: "NGN",
      ref:      reference,
      channels: ["card", "bank_transfer", "ussd", "bank"],
      metadata: { vendor_id: vendorId, plan: planKey },

      onClose: () => {
        setPaying(false);
        toast({ title: "Payment cancelled", description: "You closed the payment window." });
      },

      callback: async (response: any) => {
        try {
          const { data, error } = await supabase.functions.invoke("vendor-featured-payment", {
            body: { reference: response.reference, vendor_id: vendorId, plan: planKey },
          });
          if (error || !data?.success) throw new Error(error?.message || data?.error || "Verification failed");
          setSuccess(true);
          setPaying(false);
          toast({ title: "🌟 You're now featured!", description: `${plan.title} activated for 7 days.` });
          setTimeout(() => { onSuccess(); onOpenChange(false); setSuccess(false); }, 2000);
        } catch (err: any) {
          setPaying(false);
          toast({ title: "Verification failed", description: err.message, variant: "destructive" });
        }
      },
    }).openIframe();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!paying) { setSuccess(false); onOpenChange(v); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" /> Go Featured
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <h3 className="text-lg font-bold">You're Live!</h3>
            <p className="text-sm text-muted-foreground">Your business is now featured on Campus Market.</p>
          </div>
        ) : paying ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Verifying your payment…</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Choose a plan — pay instantly by card or bank transfer. Your listing activates automatically.
            </p>
            {(Object.entries(PLANS) as [PlanType, typeof PLANS["top_listing"]][]).map(([key, plan]) => (
              <Card key={key} className="cursor-pointer border-border/50 hover:border-accent transition-all" onClick={() => handlePay(key)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <plan.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground">{plan.title}</h3>
                        <span className="font-bold text-accent">{plan.amountDisplay}</span>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="text-success">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-8 text-xs">
                        Pay {plan.amountDisplay} — Activate Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedPaymentModal;
