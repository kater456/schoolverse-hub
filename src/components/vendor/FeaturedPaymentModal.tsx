import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Star, Film, CreditCard } from "lucide-react";

interface FeaturedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  onSuccess: () => void;
}

type PlanType = "top_listing" | "top_listing_reels";

const PLANS = {
  top_listing: {
    title: "Top Listing Only",
    amount_ng: 1000,
    amount_gh: 12,
    features: ["Appear at the top of search results", "7 days duration"],
    icon: Star,
  },
  top_listing_reels: {
    title: "Top Listing + Reels Access",
    amount_ng: 2000,
    amount_gh: 24,
    features: ["Appear at the top of search results", "Upload short video reels", "7 days duration"],
    icon: Film,
  },
};

const FeaturedPaymentModal = ({ open, onOpenChange, vendorId, onSuccess }: FeaturedPaymentModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submitRequest = async () => {
    if (!selectedPlan || !paymentRef.trim()) {
      toast({ title: "Enter your payment reference", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const plan = PLANS[selectedPlan];

    const { error } = await supabase.from("featured_listings").insert({
      vendor_id: vendorId,
      payment_reference: paymentRef.trim(),
      amount: plan.amount_ng,
      payment_status: "pending",
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Request submitted!",
        description: "Your payment will be verified by the admin. You'll be featured once confirmed.",
      });
      onSuccess();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Go Featured
          </DialogTitle>
        </DialogHeader>

        {!selectedPlan ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a plan to boost your visibility:</p>
            {(Object.entries(PLANS) as [PlanType, typeof PLANS["top_listing"]][]).map(([key, plan]) => (
              <Card
                key={key}
                className="cursor-pointer border-border/50 hover:border-accent transition-colors"
                onClick={() => setSelectedPlan(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <plan.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{plan.title}</h3>
                      <div className="flex gap-3 mt-1">
                        <span className="text-sm font-medium">🇳🇬 ₦{plan.amount_ng.toLocaleString()}</span>
                        <span className="text-sm font-medium">🇬🇭 GH₵{plan.amount_gh}</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground">✓ {f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>← Back to plans</Button>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">Payment Details</h3>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🇳🇬 For Nigeria Users</p>
                  <p className="text-sm font-semibold text-foreground">Account: 9016103308</p>
                  <p className="text-sm text-foreground">Name: Opay Kater Akase</p>
                  <p className="text-sm font-medium text-accent">Amount: ₦{PLANS[selectedPlan].amount_ng.toLocaleString()}</p>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🇬🇭 For Ghana Users (Mobile Money)</p>
                  <p className="text-sm font-semibold text-foreground">Number: 0550-588-437</p>
                  <p className="text-sm text-foreground">Name: Joseph Nabujah</p>
                  <p className="text-sm font-medium text-accent">Amount: GH₵{PLANS[selectedPlan].amount_gh}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Reference / Transaction ID</Label>
              <Input
                placeholder="Enter your payment reference..."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter the transaction reference after making payment</p>
            </div>

            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={submitRequest}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Payment for Verification
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedPaymentModal;
