import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Palette, Layout, Loader2, Upload, CheckCircle, Image as ImageIcon,
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";

interface VendorStoreUpgradeProps {
  vendor: any;
  onUpdate: (v: any) => void;
}

const VendorStoreUpgrade = ({ vendor, onUpdate }: VendorStoreUpgradeProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [bannerUrl, setBannerUrl] = useState(vendor.banner_url || "");
  const [themeColor, setThemeColor] = useState(vendor.store_theme_color || "#1e3a5f");
  const [storeLayout, setStoreLayout] = useState(vendor.store_layout || "grid");

  useEffect(() => {
    const upgraded = vendor.is_store_upgraded && vendor.store_upgrade_expires_at &&
      new Date(vendor.store_upgrade_expires_at) > new Date();
    setIsUpgraded(!!upgraded);
    setExpiresAt(vendor.store_upgrade_expires_at);
    setBannerUrl(vendor.banner_url || "");
    setThemeColor(vendor.store_theme_color || "#1e3a5f");
    setStoreLayout(vendor.store_layout || "grid");
  }, [vendor]);

  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const compressed = await compressImage(file, 1200);
    const path = `${vendor.id}/store-banner-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("vendor-media").upload(path, compressed, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
      await (supabase as any).from("vendors").update({ banner_url: urlData.publicUrl }).eq("id", vendor.id);
      onUpdate({ ...vendor, banner_url: urlData.publicUrl });
      toast({ title: "Banner uploaded!" });
    }
    setUploadingBanner(false);
  };

  const saveTheme = async () => {
    setSavingTheme(true);
    const { error } = await (supabase as any).from("vendors").update({
      store_theme_color: themeColor,
      store_layout: storeLayout,
    }).eq("id", vendor.id);
    if (!error) {
      onUpdate({ ...vendor, store_theme_color: themeColor, store_layout: storeLayout });
      toast({ title: "Store theme saved!" });
    }
    setSavingTheme(false);
  };

  const initiateUpgradePayment = () => {
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      toast({ title: "Payment system not ready, refresh and try again", variant: "destructive" });
      return;
    }
    const ref = `store_upgrade_${vendor.id}_${Date.now()}`;
    const handler = PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user!.email,
      amount: 150000, // ₦1,500 in kobo
      currency: "NGN",
      ref,
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPaying(true);
        try {
          const { data, error } = await supabase.functions.invoke("verify-store-upgrade", {
            body: { reference: response.reference, vendor_id: vendor.id },
          });
          if (error || !data?.success) {
            toast({ title: "Verification failed", description: "Contact support with ref: " + response.reference, variant: "destructive" });
          } else {
            toast({ title: "🎉 Store Upgraded!", description: "You now have premium store features for 30 days." });
            setIsUpgraded(true);
            setExpiresAt(data.ends_at);
            onUpdate({ ...vendor, is_store_upgraded: true, store_upgrade_expires_at: data.ends_at });
          }
        } catch {
          toast({ title: "Error verifying payment", variant: "destructive" });
        }
        setPaying(false);
      },
    });
    handler.openIframe();
  };

  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-6">
      {/* Upgrade Status */}
      <Card className={`border-2 ${isUpgraded ? "border-accent/50 bg-accent/5" : "border-border/50"}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className={`h-5 w-5 ${isUpgraded ? "text-accent" : "text-muted-foreground"}`} />
            {isUpgraded ? "Premium Store Active" : "Upgrade Your Store"}
            {isUpgraded && <Badge className="bg-accent text-accent-foreground text-xs">{daysLeft} days left</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isUpgraded ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your premium store is active until <strong>{new Date(expiresAt!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>.
              </p>
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle className="h-4 w-4" />
                Custom banner, theme colors, and layout options unlocked
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Unlock premium store features for <strong>₦1,500/month</strong>:
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> Custom store banner</li>
                <li className="flex items-center gap-2"><Palette className="h-4 w-4 text-accent" /> Brand theme colors</li>
                <li className="flex items-center gap-2"><Layout className="h-4 w-4 text-accent" /> Choose your store layout</li>
              </ul>
              <Button
                onClick={initiateUpgradePayment}
                disabled={paying}
                className="w-full bg-gradient-to-r from-accent to-warning text-accent-foreground shadow-lg hover:shadow-xl"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Upgrade for ₦1,500/month
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Store Customization (only if upgraded) */}
      {isUpgraded && (
        <>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Store Banner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bannerUrl && (
                <img src={bannerUrl} alt="Store banner" className="w-full h-32 object-cover rounded-lg border border-border/50" />
              )}
              <label className="cursor-pointer">
                <Button variant="outline" className="w-full" disabled={uploadingBanner} asChild>
                  <span>
                    {uploadingBanner ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> {bannerUrl ? "Change Banner" : "Upload Banner"}</>}
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
              </label>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Theme & Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Product Layout</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "grid", label: "Grid", icon: "▦" },
                    { value: "list", label: "List", icon: "☰" },
                    { value: "showcase", label: "Showcase", icon: "◎" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStoreLayout(opt.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        storeLayout === opt.value
                          ? "border-accent bg-accent/10"
                          : "border-border/50 hover:border-accent/30"
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={saveTheme} disabled={savingTheme} className="w-full">
                {savingTheme ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Theme
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default VendorStoreUpgrade;
