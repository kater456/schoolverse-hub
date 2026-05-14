import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { resolvePlan } from "@/lib/pricing";
import { compressImage } from "@/lib/compressImage";
import {
  ShieldCheck, Upload, Loader2, CheckCircle, CreditCard,
  Eye, MapPin, Star,
} from "lucide-react";

interface Props {
  onVerified?: () => void;
}

export default function UserVerification({ onVerified }: Props) {
  const { user }    = useAuth();
  const { toast }   = useToast();

  const [isVerified,   setIsVerified]   = useState(false);
  const [verifiedAt,   setVerifiedAt]   = useState<string | null>(null);
  const [pending,      setPending]      = useState(false);
  const [idUrl,        setIdUrl]        = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [paying,       setPaying]       = useState(false);
  const [priceDisplay, setPriceDisplay] = useState("₦1,000");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load verification status ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Inject Paystack script
    if (!document.querySelector('script[src*="paystack"]')) {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      document.body.appendChild(s);
    }

    // Check profile
    supabase.from("profiles").select("is_user_verified, user_verified_at").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.is_user_verified) {
          setIsVerified(true);
          setVerifiedAt((data as any)?.user_verified_at ?? null);
        }
      });

    // Check if pending submission exists
    (supabase as any).from("user_verifications").select("status, id_document_url")
      .eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => {
        if (data?.status === "pending") setPending(true);
        if (data?.id_document_url) setIdUrl(data.id_document_url);
      });

    // Resolve price for user's currency
    resolvePlan("user_verification").then((p) => setPriceDisplay(p.display)).catch(() => {});
  }, [user]);

  // ── Upload ID ────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200);
      const path = `user-verif/${user.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("vendor-media")
        .upload(path, compressed, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(data.path);
      setIdUrl(urlData.publicUrl);
      toast({ title: "ID uploaded ✅" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  // ── Pay and verify ────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!idUrl) {
      toast({ title: "Upload your student ID first", variant: "destructive" });
      return;
    }
    if (!(window as any).PaystackPop) {
      toast({ title: "Loading payment…", description: "Please try again in a moment." });
      return;
    }

    const plan = await resolvePlan("user_verification");

    const handler = (window as any).PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
      email: user!.email,
      amount: plan.amountSubunits,
      currency: plan.currency,
      ref: `user_verif_${user!.id}_${Date.now()}`,
      metadata: { user_id: user!.id, payment_type: "user_verification" },
      channels: plan.channels,
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPaying(true);
        try {
          // Save verification record
          await (supabase as any).from("user_verifications").insert({
            user_id:           user!.id,
            id_document_url:   idUrl,
            payment_reference: response.reference,
            status:            "pending",
          });
          setPending(true);
          toast({
            title: "Verification submitted ✅",
            description: "Your student ID and payment are under review. Approval usually takes a few hours.",
          });
          onVerified?.();
        } catch (err: any) {
          toast({ title: "Submission error", description: err.message, variant: "destructive" });
        }
        setPaying(false);
      },
    });
    handler.openIframe();
  };

  // ── Already verified ──────────────────────────────────────────────────────
  if (isVerified) {
    return (
      <Card className="border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  Verified Student ✅
                </p>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] h-4">
                  Trusted
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your student identity has been confirmed.
                {verifiedAt && ` Verified ${new Date(verifiedAt).toLocaleDateString()}.`}
              </p>

              {/* Perks */}
              <div className="mt-3 grid grid-cols-1 gap-1.5">
                {[
                  { icon: <MapPin className="h-3 w-3" />, label: "See vendor live locations on campus" },
                  { icon: <Eye className="h-3 w-3" />, label: "Access verified-only store features" },
                  { icon: <Star className="h-3 w-3" />, label: "Trusted buyer badge on all interactions" },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-emerald-500">{p.icon}</span>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Pending review ────────────────────────────────────────────────────────
  if (pending) {
    return (
      <Card className="border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Verification under review
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your student ID and payment have been received. Our team will confirm your account within a few hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Not yet verified — show form ──────────────────────────────────────────
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Verify Your Student Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* What you get */}
        <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary">What you unlock:</p>
          <div className="space-y-1.5">
            {[
              { icon: <MapPin className="h-3 w-3" />,  label: "See live vendor locations on campus" },
              { icon: <Eye className="h-3 w-3" />,     label: "Access verified-only store deals" },
              { icon: <Star className="h-3 w-3" />,    label: "Trusted buyer badge — sellers trust you more" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-primary">{p.icon}</span>
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {/* Step 1 */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              idUrl ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {idUrl ? <CheckCircle className="h-3 w-3" /> : "1"}
            </div>
            <span className={idUrl ? "text-foreground font-medium" : "text-muted-foreground"}>
              Upload student or government ID
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              2
            </div>
            <span className="text-muted-foreground">
              Pay {priceDisplay} one-time fee
            </span>
          </div>
        </div>

        {/* Upload zone */}
        <div>
          <label
            onClick={() => fileRef.current?.click()}
            className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
              idUrl
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Uploading…</span></>
            ) : idUrl ? (
              <><CheckCircle className="h-5 w-5 text-primary" /><span className="text-sm text-primary font-medium">ID uploaded ✅ — tap to change</span></>
            ) : (
              <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Tap to upload your student ID</span></>
            )}
          </label>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
          <p className="text-[10px] text-muted-foreground mt-1">
            School ID card, matric card, or government ID. Private — only admin can view.
          </p>
        </div>

        {/* Pay button */}
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
          onClick={handlePay}
          disabled={paying || uploading || !idUrl}
        >
          {paying
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing payment…</>
            : <><CreditCard className="h-4 w-4 mr-2" />Pay {priceDisplay} &amp; Get Verified</>
          }
        </Button>

        {!idUrl && (
          <p className="text-xs text-muted-foreground text-center">
            Upload your ID first, then pay to complete verification.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          One-time fee. Card, Google Pay, Apple Pay &amp; bank transfer accepted.
        </p>
      </CardContent>
    </Card>
  );
}
