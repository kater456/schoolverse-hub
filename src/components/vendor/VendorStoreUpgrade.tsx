import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown, Palette, Layout, Loader2, Upload, CheckCircle,
  Image as ImageIcon, GripVertical, Eye, Layers, Box,
  AlertTriangle, Save, RotateCcw, ShoppingBag, Tag,
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";

interface VendorStoreUpgradeProps {
  vendor: any;
  onUpdate: (v: any) => void;
}

// Max times a vendor can save their store design
const MAX_DESIGN_SAVES = 2;

// ── Draggable product card ────────────────────────────────────────────────────
const DraggableProduct = ({
  product, index, isDragging, onDragStart, onDragOver, onDrop, themeColor, view,
}: {
  product: any; index: number; isDragging: boolean;
  onDragStart: (i: number) => void; onDragOver: (i: number) => void; onDrop: () => void;
  themeColor: string; view: string;
}) => {
  if (view === "hanger") {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={onDrop}
        className={`flex flex-col items-center cursor-grab active:cursor-grabbing transition-all select-none ${isDragging ? "opacity-40 scale-95" : ""}`}
      >
        {/* Hanger hook */}
        <div className="w-px h-4 bg-gray-400" />
        <div className="w-8 h-1.5 rounded-full bg-gray-400 mb-0.5" />
        {/* Clothes on hanger */}
        <div
          className="relative w-16 rounded-xl overflow-hidden shadow-md border-2"
          style={{ borderColor: themeColor + "60" }}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 flex items-center justify-center text-2xl" style={{ background: themeColor + "15" }}>
              🏪
            </div>
          )}
          <div className="p-1.5" style={{ background: themeColor + "10" }}>
            <p className="text-[9px] font-semibold text-center truncate">{product.name}</p>
            <p className="text-[9px] text-center font-bold" style={{ color: themeColor }}>₦{Number(product.price).toLocaleString()}</p>
          </div>
        </div>
        <GripVertical className="h-3 w-3 text-muted-foreground mt-1" />
      </div>
    );
  }

  if (view === "shelf-3d") {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={onDrop}
        className={`relative cursor-grab active:cursor-grabbing transition-all select-none ${isDragging ? "opacity-40 scale-95" : ""}`}
        style={{ perspective: "300px" }}
      >
        <div
          className="rounded-xl overflow-hidden shadow-xl border-2 transition-transform hover:scale-105"
          style={{
            borderColor: themeColor + "50",
            transform: "rotateY(-8deg) rotateX(4deg)",
            background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)`,
          }}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-24 object-cover" />
          ) : (
            <div className="w-full h-24 flex items-center justify-center text-3xl" style={{ background: themeColor + "10" }}>🏪</div>
          )}
          {/* 3D side face */}
          <div className="absolute right-0 top-0 bottom-0 w-2 opacity-40 rounded-r-xl" style={{ background: themeColor }} />
          <div className="p-2">
            <p className="text-[10px] font-semibold truncate">{product.name}</p>
            <p className="text-[10px] font-bold" style={{ color: themeColor }}>₦{Number(product.price).toLocaleString()}</p>
          </div>
          {/* Shadow under box */}
          <div className="absolute -bottom-1 left-2 right-2 h-1 rounded-full blur-sm opacity-30" style={{ background: themeColor }} />
        </div>
        <GripVertical className="h-3 w-3 text-muted-foreground mx-auto mt-1" />
      </div>
    );
  }

  // Default grid/shelf view
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      className={`rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all select-none group ${isDragging ? "opacity-40 scale-95" : "hover:shadow-md"}`}
      style={{ borderColor: themeColor + "40" }}
    >
      <div className="relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 flex items-center justify-center text-3xl" style={{ background: themeColor + "10" }}>🏪</div>
        )}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-white drop-shadow" />
        </div>
      </div>
      <div className="p-2" style={{ background: themeColor + "08" }}>
        <p className="text-xs font-semibold truncate">{product.name}</p>
        <p className="text-xs font-bold" style={{ color: themeColor }}>₦{Number(product.price).toLocaleString()}</p>
        {product.category && <Badge variant="secondary" className="text-[9px] mt-0.5">{product.category}</Badge>}
      </div>
    </div>
  );
};

// ── Shelf background renderer ─────────────────────────────────────────────────
const ShelfBackground = ({ themeColor, view, children }: { themeColor: string; view: string; children: React.ReactNode }) => {
  if (view === "hanger") {
    return (
      <div className="relative rounded-2xl overflow-hidden p-6 min-h-[220px]"
        style={{ background: `linear-gradient(180deg, ${themeColor}15 0%, ${themeColor}05 100%)` }}>
        {/* Hanging rod */}
        <div className="absolute top-4 left-4 right-4 h-2 rounded-full shadow-inner"
          style={{ background: `linear-gradient(90deg, ${themeColor}80, ${themeColor}40, ${themeColor}80)` }} />
        <div className="flex gap-6 mt-4 flex-wrap justify-center">{children}</div>
      </div>
    );
  }
  if (view === "shelf-3d") {
    return (
      <div className="relative rounded-2xl overflow-hidden p-6 min-h-[220px]"
        style={{ background: `linear-gradient(160deg, ${themeColor}20 0%, #1a1a2e 100%)` }}>
        {/* Floor grid for 3D effect */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `linear-gradient(${themeColor} 1px, transparent 1px), linear-gradient(90deg, ${themeColor} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="grid grid-cols-3 gap-4 relative z-10">{children}</div>
      </div>
    );
  }
  // Flat shelf
  return (
    <div className="rounded-2xl p-4 min-h-[180px]"
      style={{ background: `linear-gradient(135deg, ${themeColor}12, ${themeColor}05)` }}>
      {/* Shelf line */}
      <div className="h-px mb-4 opacity-30" style={{ background: themeColor }} />
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">{children}</div>
      {/* Bottom shelf */}
      <div className="h-1.5 mt-4 rounded-b-lg opacity-20 shadow-inner" style={{ background: themeColor }} />
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const VendorStoreUpgrade = ({ vendor, onUpdate }: VendorStoreUpgradeProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isUpgraded,      setIsUpgraded]      = useState(false);
  const [expiresAt,       setExpiresAt]       = useState<string | null>(null);
  const [paying,          setPaying]          = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingDesign,    setSavingDesign]    = useState(false);
  const [designSaveCount, setDesignSaveCount] = useState(0);
  const [products,        setProducts]        = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [previewMode,     setPreviewMode]     = useState(false);

  // Design state
  const [bannerUrl,       setBannerUrl]       = useState(vendor.banner_url || "");
  const [themeColor,      setThemeColor]      = useState(vendor.store_theme_color || "#6366f1");
  const [accentColor,     setAccentColor]     = useState(vendor.store_accent_color || "#f59e0b");
  const [storeLayout,     setStoreLayout]     = useState(vendor.store_layout || "grid");
  const [namePosition,    setNamePosition]    = useState(vendor.store_name_position || "top-left");
  const [displayView,     setDisplayView]     = useState(vendor.store_display_view || "shelf");
  const [productOrder,    setProductOrder]    = useState<string[]>([]);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    // Load Paystack script for upgrade payment
    if (!(window as any).PaystackPop) {
      const script = document.createElement("script");
      script.src   = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const upgraded = vendor.is_store_upgraded && vendor.store_upgrade_expires_at &&
      new Date(vendor.store_upgrade_expires_at) > new Date();
    setIsUpgraded(!!upgraded);
    setExpiresAt(vendor.store_upgrade_expires_at);
    setBannerUrl(vendor.banner_url || "");
    setThemeColor(vendor.store_theme_color || "#6366f1");
    setAccentColor(vendor.store_accent_color || "#f59e0b");
    setStoreLayout(vendor.store_layout || "grid");
    setNamePosition(vendor.store_name_position || "top-left");
    setDisplayView(vendor.store_display_view || "shelf");
    setDesignSaveCount(vendor.store_design_saves || 0);
  }, [vendor]);

  // Load products for drag arrangement
  useEffect(() => {
    if (!vendor.id || !isUpgraded) return;
    (supabase as any).from("vendor_products").select("*")
      .eq("vendor_id", vendor.id).eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }: any) => {
        setProducts(data || []);
        setProductOrder((data || []).map((p: any) => p.id));
        setLoadingProducts(false);
      });
  }, [vendor.id, isUpgraded]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((index: number) => {
    dragIndex.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOver(index);
  }, []);

  const handleDrop = useCallback(() => {
    if (dragIndex.current === null || dragOver === null || dragIndex.current === dragOver) {
      dragIndex.current = null;
      setDragOver(null);
      return;
    }
    const newProducts = [...products];
    const [moved] = newProducts.splice(dragIndex.current, 1);
    newProducts.splice(dragOver, 0, moved);
    setProducts(newProducts);
    setProductOrder(newProducts.map((p) => p.id));
    dragIndex.current = null;
    setDragOver(null);
  }, [products, dragOver]);

  // ── Banner upload ─────────────────────────────────────────────────────────
  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const compressed = await compressImage(file, 1400);
    const path = `${vendor.id}/store-banner-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("vendor-media").upload(path, compressed, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
      await (supabase as any).from("vendors").update({ banner_url: urlData.publicUrl }).eq("id", vendor.id);
      onUpdate({ ...vendor, banner_url: urlData.publicUrl });
      toast({ title: "Banner uploaded! 🎨" });
    }
    setUploadingBanner(false);
  };

  // ── Save full store design ────────────────────────────────────────────────
  const saveDesign = async () => {
    if (designSaveCount >= MAX_DESIGN_SAVES) {
      toast({ title: "Design save limit reached", description: `You can only save your store design ${MAX_DESIGN_SAVES} times total.`, variant: "destructive" });
      return;
    }

    setSavingDesign(true);

    // Save design settings to vendor record
    const { error } = await (supabase as any).from("vendors").update({
      store_theme_color:    themeColor,
      store_accent_color:   accentColor,
      store_layout:         storeLayout,
      store_name_position:  namePosition,
      store_display_view:   displayView,
      store_design_saves:   designSaveCount + 1,
    }).eq("id", vendor.id);

    if (error) {
      toast({ title: "Error saving design", description: error.message, variant: "destructive" });
      setSavingDesign(false);
      return;
    }

    // Save product display order
    const updates = products.map((p, i) =>
      (supabase as any).from("vendor_products").update({ display_order: i }).eq("id", p.id)
    );
    await Promise.all(updates);

    const newCount = designSaveCount + 1;
    setDesignSaveCount(newCount);
    onUpdate({
      ...vendor,
      store_theme_color: themeColor,
      store_accent_color: accentColor,
      store_layout: storeLayout,
      store_name_position: namePosition,
      store_display_view: displayView,
      store_design_saves: newCount,
    });
    toast({
      title: "Store design saved! 🎉",
      description: newCount >= MAX_DESIGN_SAVES
        ? "This was your final design save. Your store is locked in."
        : `${MAX_DESIGN_SAVES - newCount} save${MAX_DESIGN_SAVES - newCount !== 1 ? "s" : ""} remaining.`,
    });
    setSavingDesign(false);
  };

  // ── Payment script loader ─────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).PaystackPop) return; // already loaded
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return; // already injected
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const initiateUpgradePayment = () => {
    // If script not loaded yet, inject it and retry in 1.5s
    if (!(window as any).PaystackPop) {
      if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.async = true;
        document.body.appendChild(s);
      }
      toast({ title: "Loading payment…", description: "Please click again in a moment." });
      return;
    }
    if (!user?.email) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    const ref = `store_upgrade_${vendor.id}_${Date.now()}`;
    const PaystackPop = (window as any).PaystackPop;
    const handler = PaystackPop.setup({
      key: "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
      email: user!.email,
      amount: 150000,
      currency: "NGN",
      ref,
      metadata: { vendor_id: vendor.id },
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPaying(true);
        try {
          const { data, error } = await supabase.functions.invoke("verify-store-upgrade", {
            body: { reference: response.reference, vendor_id: vendor.id },
          });
          if (error || !data?.success) throw new Error(error?.message || data?.error || "Verification failed");
          const endsAt = data.ends_at;
          toast({ title: "🎉 Store Upgraded!", description: "Premium features active for 30 days." });
          setIsUpgraded(true);
          setExpiresAt(endsAt);
          onUpdate({ ...vendor, is_store_upgraded: true, store_upgrade_expires_at: endsAt });
        } catch (err: any) {
          toast({ title: "Error", description: "Payment received but activation failed. Ref: " + response.reference, variant: "destructive" });
        }
        setPaying(false);
      },
    });
    handler.openIframe();
  };

  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : 0;
  const savesLeft = MAX_DESIGN_SAVES - designSaveCount;
  const designLocked = designSaveCount >= MAX_DESIGN_SAVES;

  const orderedProducts = productOrder
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as any[];

  return (
    <div className="space-y-6">

      {/* ── Upgrade status card ── */}
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
                Full store designer unlocked — banner, colors, layout, product arrangement
              </div>
              {designLocked ? (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Design is locked — you've used all {MAX_DESIGN_SAVES} design saves. Your store looks exactly as you designed it.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Save className="h-4 w-4" />
                  {savesLeft} design save{savesLeft !== 1 ? "s" : ""} remaining (lifetime limit: {MAX_DESIGN_SAVES})
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Unlock your full store designer for <strong>₦2,000/month</strong>:
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> Custom store banner</li>
                <li className="flex items-center gap-2"><Palette className="h-4 w-4 text-accent" /> Brand colors & accent colors</li>
                <li className="flex items-center gap-2"><Layout className="h-4 w-4 text-accent" /> Choose product display layout</li>
                <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-accent" /> 2D shelf or 3D display views</li>
                <li className="flex items-center gap-2"><Box className="h-4 w-4 text-accent" /> Clothes hanger 3D arrangement</li>
                <li className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-accent" /> Drag & drop product order</li>
                <li className="flex items-center gap-2"><Tag className="h-4 w-4 text-accent" /> Store name placement control</li>
              </ul>
              <Button
                onClick={initiateUpgradePayment}
                disabled={paying}
                className="w-full bg-gradient-to-r from-accent to-primary text-accent-foreground shadow-lg hover:shadow-xl"
              >
                {paying ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying payment…</>
                ) : (
                  <><Crown className="h-4 w-4 mr-2" />Upgrade for ₦2,000/month</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Store Designer (only if upgraded) ── */}
      {isUpgraded && (
        <Tabs defaultValue="design" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="design"><Palette className="h-4 w-4 mr-1" />Colors & Style</TabsTrigger>
            <TabsTrigger value="arrange"><GripVertical className="h-4 w-4 mr-1" />Arrange Products</TabsTrigger>
            <TabsTrigger value="banner"><ImageIcon className="h-4 w-4 mr-1" />Banner</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" />Preview</TabsTrigger>
          </TabsList>

          {/* ── DESIGN TAB ── */}
          <TabsContent value="design" className="space-y-4">

            {/* Colors */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> Store Colors</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Primary Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-border cursor-pointer" disabled={designLocked} />
                      <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                        className="flex-1 font-mono text-xs" disabled={designLocked} />
                    </div>
                    <div className="h-8 rounded-lg border border-border/50" style={{ background: themeColor }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-border cursor-pointer" disabled={designLocked} />
                      <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 font-mono text-xs" disabled={designLocked} />
                    </div>
                    <div className="h-8 rounded-lg border border-border/50" style={{ background: accentColor }} />
                  </div>
                </div>

                {/* Color preview */}
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <div className="h-10 flex items-center px-4 gap-2" style={{ background: themeColor }}>
                    <ShoppingBag className="h-4 w-4 text-white" />
                    <span className="text-white text-sm font-semibold">{vendor.business_name}</span>
                    <div className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: accentColor, color: "#fff" }}>Shop</div>
                  </div>
                  <div className="h-6" style={{ background: themeColor + "15" }} />
                </div>
              </CardContent>
            </Card>

            {/* Name position */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Store Name Position</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "top-left",    label: "Top Left" },
                    { value: "top-center",  label: "Top Center" },
                    { value: "top-right",   label: "Top Right" },
                    { value: "mid-left",    label: "Mid Left" },
                    { value: "mid-center",  label: "Mid Center" },
                    { value: "mid-right",   label: "Mid Right" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => !designLocked && setNamePosition(opt.value)}
                      disabled={designLocked}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        namePosition === opt.value ? "border-accent bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:border-accent/40"
                      } ${designLocked ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Layout */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4" /> Product Grid Layout</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "grid",     label: "Grid",     icon: "▦" },
                    { value: "list",     label: "List",     icon: "☰" },
                    { value: "showcase", label: "Showcase", icon: "◎" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => !designLocked && setStoreLayout(opt.value)}
                      disabled={designLocked}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        storeLayout === opt.value ? "border-accent bg-accent/10" : "border-border/50 hover:border-accent/30"
                      } ${designLocked ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Display view */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Box className="h-4 w-4" /> Product Display Style</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "shelf",    label: "2D Shelf",    icon: <Layers className="h-5 w-5" /> },
                    { value: "shelf-3d", label: "3D Display",  icon: <Box className="h-5 w-5" /> },
                    { value: "hanger",   label: "Hanger Rail", icon: <span className="text-lg">👗</span> },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => !designLocked && setDisplayView(opt.value)}
                      disabled={designLocked}
                      className={`p-3 rounded-xl border-2 text-center flex flex-col items-center gap-1.5 transition-all ${
                        displayView === opt.value ? "border-accent bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:border-accent/30"
                      } ${designLocked ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {opt.icon}
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {displayView === "hanger" ? "Products hang on a rail — great for fashion & clothing vendors"
                    : displayView === "shelf-3d" ? "Products shown with 3D depth — premium showcase feel"
                    : "Classic 2D shelf layout — clean and minimal"}
                </p>
              </CardContent>
            </Card>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <Button onClick={saveDesign} disabled={savingDesign || designLocked}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                {savingDesign ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {designLocked ? "Design Locked" : `Save Design (${savesLeft} save${savesLeft !== 1 ? "s" : ""} left)`}
              </Button>
              {!designLocked && (
                <Button variant="outline" size="icon" title="Reset to defaults"
                  onClick={() => { setThemeColor("#6366f1"); setAccentColor("#f59e0b"); setStoreLayout("grid"); setDisplayView("shelf"); setNamePosition("top-left"); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ── ARRANGE TAB ── */}
          <TabsContent value="arrange" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <GripVertical className="h-4 w-4" /> Drag & Drop Product Order
                  {designLocked && <Badge variant="destructive" className="text-[10px]">Locked</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : orderedProducts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No active products yet. Add products in the Products tab first.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {designLocked ? "Product arrangement is locked." : "Drag products to rearrange them in your store. This order is what customers see."}
                    </p>
                    <ShelfBackground themeColor={themeColor} view={displayView}>
                      {orderedProducts.map((product, index) => (
                        <DraggableProduct
                          key={product.id}
                          product={product}
                          index={index}
                          isDragging={dragOver === index && dragIndex.current !== null && dragIndex.current !== index}
                          onDragStart={designLocked ? () => {} : handleDragStart}
                          onDragOver={designLocked ? () => {} : handleDragOver}
                          onDrop={designLocked ? () => {} : handleDrop}
                          themeColor={themeColor}
                          view={displayView}
                        />
                      ))}
                    </ShelfBackground>

                    {!designLocked && (
                      <Button onClick={saveDesign} disabled={savingDesign} className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                        {savingDesign ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Arrangement ({savesLeft} save{savesLeft !== 1 ? "s" : ""} left)
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BANNER TAB ── */}
          <TabsContent value="banner" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Store Banner</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Banner appears at the top of your public store page. Recommended: 1400×400px.</p>
                {bannerUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50">
                    <img src={bannerUrl} alt="Store banner" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 flex items-end p-4"
                      style={{ background: `linear-gradient(transparent, ${themeColor}cc)` }}>
                      <span className="text-white font-bold text-lg drop-shadow">{vendor.business_name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground"
                    style={{ background: themeColor + "08" }}>
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No banner yet</p>
                    </div>
                  </div>
                )}
                <label className="cursor-pointer block">
                  <Button variant="outline" className="w-full" disabled={uploadingBanner} asChild>
                    <span>
                      {uploadingBanner
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                        : <><Upload className="h-4 w-4 mr-2" /> {bannerUrl ? "Change Banner" : "Upload Banner"}</>}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
                </label>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PREVIEW TAB ── */}
          <TabsContent value="preview" className="space-y-3">
            <div className="rounded-2xl overflow-hidden border-2 border-border/50 shadow-xl">
              {/* Store header */}
              <div className="relative" style={{ background: themeColor }}>
                {bannerUrl && (
                  <img src={bannerUrl} alt="banner" className="w-full h-32 object-cover opacity-50" />
                )}
                <div className={`absolute inset-0 flex items-${namePosition.startsWith("mid") ? "center" : "start"} ${
                  namePosition.endsWith("left") ? "justify-start" : namePosition.endsWith("right") ? "justify-end" : "justify-center"
                } p-4`}>
                  <div className="text-center">
                    <h2 className="text-white font-bold text-xl drop-shadow">{vendor.business_name}</h2>
                    <p className="text-white/70 text-xs">{vendor.category}</p>
                    <div className="mt-1 px-2 py-0.5 rounded-full inline-block text-xs font-bold"
                      style={{ background: accentColor, color: "#fff" }}>
                      Premium Store
                    </div>
                  </div>
                </div>
                {!bannerUrl && <div className="h-28" />}
              </div>

              {/* Products preview */}
              <div className="p-4" style={{ background: themeColor + "08" }}>
                <ShelfBackground themeColor={themeColor} view={displayView}>
                  {orderedProducts.slice(0, 6).map((product, index) => (
                    <DraggableProduct
                      key={product.id}
                      product={product}
                      index={index}
                      isDragging={false}
                      onDragStart={() => {}}
                      onDragOver={() => {}}
                      onDrop={() => {}}
                      themeColor={themeColor}
                      view={displayView}
                    />
                  ))}
                  {orderedProducts.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
                      Add products to see them here
                    </div>
                  )}
                </ShelfBackground>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 flex items-center justify-between text-xs" style={{ background: themeColor }}>
                <span className="text-white/60">Powered by Campus Market</span>
                <div className="w-4 h-4 rounded-full" style={{ background: accentColor }} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This is how your store looks to customers. Go to Design tab to make changes.
              {designLocked && " Your design is now locked."}
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default VendorStoreUpgrade;
