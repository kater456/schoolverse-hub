import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import ContactVendorButton from "@/components/ContactVendorButton";
import { TrustScoreBadge, computeTrustScore } from "@/components/guarantee/TrustScore";
import {
  Search, ShieldCheck, MapPin, Package, ArrowLeft, Share2,
  Loader2, ShoppingBag, Grid3X3, LayoutList, X, Check,
  Store, Star, Eye, Heart,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  display_order: number | null;
}

// ── Keyframe injection ────────────────────────────────────────────────────────
const STYLE = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .store-card { animation: fadeSlideUp 0.4s ease both; }
  .store-hero { animation: fadeIn 0.5s ease both; }
  .store-stats { animation: scaleIn 0.4s 0.2s ease both; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .store-product-card .overlay { transition: opacity 0.2s ease; opacity: 0; }
  .store-product-card:hover .overlay { opacity: 1; }
  .store-product-card img { transition: transform 0.35s ease; }
  .store-product-card:hover img { transform: scale(1.06); }
`;

// ── Main Component ────────────────────────────────────────────────────────────
const StorePage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, likes: 0, avgRating: 0, totalRatings: 0 });
  const [vendorOnline, setVendorOnline] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copied, setCopied] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);

  // Sticky header appears once hero scrolls out
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [vendor]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!vendorId) return;

    const load = async () => {
      try {
        const [vendorRes, productsRes, viewsRes, likesRes, ratingsRes, presenceRes] =
          await Promise.all([
            supabase
              .from("vendors")
              .select("*, schools(name, id), campus_locations(name)")
              .eq("id", vendorId)
              .maybeSingle(),
            (supabase as any)
              .from("vendor_products")
              .select("*")
              .eq("vendor_id", vendorId)
              .eq("is_active", true)
              .order("display_order", { ascending: true }),
            supabase
              .from("vendor_views")
              .select("id", { count: "exact", head: true })
              .eq("vendor_id", vendorId),
            supabase
              .from("vendor_likes")
              .select("id", { count: "exact", head: true })
              .eq("vendor_id", vendorId),
            supabase.from("vendor_ratings").select("rating").eq("vendor_id", vendorId),
            (supabase as any)
              .from("vendor_presence")
              .select("is_online, last_seen")
              .eq("vendor_id", vendorId)
              .maybeSingle(),
          ]);

        if (vendorRes.data) setVendor(vendorRes.data);
        setProducts(productsRes.data || []);

        const ratings: any[] = ratingsRes.data || [];
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
            : 0;
        setStats({
          views: viewsRes.count || 0,
          likes: likesRes.count || 0,
          avgRating,
          totalRatings: ratings.length,
        });

        const presence = presenceRes.data;
        if (presence) {
          const isRecent =
            Date.now() - new Date(presence.last_seen).getTime() < 5 * 60 * 1000;
          setVendorOnline(presence.is_online && isRecent);
        }
      } catch (err) {
        console.error("StorePage load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [vendorId]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(cats)] as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const shareStore = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Store link copied! 🔗" });
  };

  const isUpgraded =
    vendor?.is_store_upgraded === true &&
    (!vendor?.store_upgrade_expires_at ||
      new Date(vendor.store_upgrade_expires_at) > new Date());
  const themeColor = isUpgraded && vendor?.store_theme_color ? vendor.store_theme_color : null;
  const accentColor =
    isUpgraded && vendor?.store_accent_color ? vendor.store_accent_color : null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <style>{STYLE}</style>
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-3">
          <Store className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading store…</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <style>{STYLE}</style>
        <Navbar />
        <div className="text-center pt-32">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold mb-2">Store not found</h2>
          <Button variant="ghost" onClick={() => navigate("/browse")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={
        themeColor
          ? ({
              "--vendor-theme": themeColor,
              "--vendor-accent": accentColor || themeColor,
            } as React.CSSProperties)
          : {}
      }
    >
      <style>{STYLE}</style>
      <Navbar />

      {/* ── Sticky mini-header ── */}
      <div
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          stickyVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2 mt-16 flex items-center gap-3">
          <Avatar className="h-7 w-7 border border-border/50 shrink-0">
            {vendor.profile_image_url ? (
              <AvatarImage
                src={vendor.profile_image_url}
                alt={vendor.business_name}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {vendor.business_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm truncate flex-1">
            {vendor.business_name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
            <Package className="h-3 w-3" />
            {products.length} items
          </span>
        </div>
      </div>

      {/* ── HERO ── */}
      <div ref={heroRef} className="relative pt-16 store-hero">
        {/* Banner */}
        <div
          className="w-full h-44 sm:h-56 relative overflow-hidden"
          style={{
            background: themeColor
              ? `linear-gradient(135deg, ${themeColor}dd, ${accentColor || themeColor}88)`
              : "linear-gradient(135deg, hsl(var(--accent)/0.15) 0%, hsl(var(--muted)) 100%)",
          }}
        >
          {vendor.banner_url && (
            <img
              src={vendor.banner_url}
              alt={`${vendor.business_name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          {/* Gradient fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

          {/* Store label chip */}
          <div className="absolute top-4 left-4">
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm border"
              style={
                themeColor
                  ? { background: `${themeColor}cc`, color: "#fff", borderColor: "transparent" }
                  : { background: "hsl(var(--background)/80)", borderColor: "hsl(var(--border)/50)" }
              }
            >
              <Store className="h-3 w-3" /> Store
            </span>
          </div>
        </div>

        {/* Identity card */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative -mt-14 flex items-end gap-4 pb-3">
            {/* Avatar */}
            <div className="relative shrink-0 z-10">
              <Avatar
                className="h-20 w-20 border-4 border-background shadow-xl"
                style={{ borderColor: themeColor ? `${themeColor}50` : undefined }}
              >
                {vendor.profile_image_url ? (
                  <AvatarImage
                    src={vendor.profile_image_url}
                    alt={vendor.business_name}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback
                  className="text-2xl font-bold"
                  style={{
                    background: themeColor ? `${themeColor}20` : undefined,
                    color: themeColor || undefined,
                  }}
                >
                  {vendor.business_name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              {vendorOnline && (
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div className="flex-1" />
            {/* Action buttons */}
            <div className="flex gap-2 pb-0.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5"
                onClick={shareStore}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Share"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5" asChild>
                <Link to={`/vendor/${vendorId}`}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Profile
                </Link>
              </Button>
            </div>
          </div>

          {/* Name + badges */}
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {vendor.business_name}
              </h1>
              {vendorOnline && (
                <Badge className="bg-green-500/20 text-green-600 text-[10px] px-1.5 h-5">
                  ● Live
                </Badge>
              )}
              {vendor.is_vendor_of_week &&
                vendor.vendor_of_week_expires_at &&
                new Date(vendor.vendor_of_week_expires_at) > new Date() && (
                  <Badge className="bg-accent/20 text-accent text-[10px] px-1.5 h-5">
                    🏆 Vendor of the Week
                  </Badge>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {vendor.is_verified && (
                <Badge className="bg-primary/10 text-primary text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              <Badge variant="secondary">{vendor.category}</Badge>
              {vendor.schools?.name && (
                <Badge variant="outline">🎓 {vendor.schools.name}</Badge>
              )}
              {vendor.campus_locations?.name && (
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {vendor.campus_locations.name}
                </Badge>
              )}
              <TrustScoreBadge score={computeTrustScore(vendor)} size="xs" />
            </div>
            {vendor.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{vendor.description}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-5 store-stats">
            {[
              { label: "Products", value: String(products.length), icon: "📦" },
              { label: "Views", value: stats.views > 999 ? `${(stats.views / 1000).toFixed(1)}k` : String(stats.views), icon: "👁" },
              { label: "Likes", value: String(stats.likes), icon: "❤️" },
              {
                label: "Rating",
                value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)}★` : "—",
                icon: "⭐",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-2 rounded-xl border border-border/40 bg-muted/40 hover:bg-muted/70 transition-colors"
                style={
                  themeColor
                    ? { borderColor: `${themeColor}25`, background: `${themeColor}06` }
                    : {}
                }
              >
                <div className="text-base leading-tight">{stat.icon}</div>
                <div className="text-sm font-bold text-foreground leading-tight">
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRODUCTS ── */}
      <main className="max-w-4xl mx-auto px-4 pb-32">
        {/* Sticky search + filter bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur pb-3 pt-1 -mx-4 px-4 border-b border-border/30 mb-4">
          {/* Search + view toggle */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={`Search in ${vendor.business_name}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/50 border-border/50 focus-visible:ring-1"
              />
              {search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 w-9 p-0 shrink-0 transition-all ${
                viewMode === "grid" ? "bg-accent/10 border-accent/40 text-accent" : ""
              }`}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 w-9 p-0 shrink-0 transition-all ${
                viewMode === "list" ? "bg-accent/10 border-accent/40 text-accent" : ""
              }`}
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          {/* Category pills */}
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    activeCategory === cat
                      ? "text-white border-transparent shadow-sm"
                      : "bg-transparent text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                  }`}
                  style={
                    activeCategory === cat
                      ? {
                          background: themeColor || "hsl(var(--accent))",
                          borderColor: "transparent",
                        }
                      : {}
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-muted-foreground mb-3 px-0.5">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "product" : "products"}
          {search && ` matching "${search}"`}
          {activeCategory !== "All" && ` · ${activeCategory}`}
        </p>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16 store-card">
            <Package className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-semibold text-foreground mb-1">No products found</p>
            <p className="text-sm text-muted-foreground">
              {search || activeCategory !== "All"
                ? "Try adjusting your search or filter"
                : "This vendor hasn't added products yet"}
            </p>
            {(search || activeCategory !== "All") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Grid view */}
        {viewMode === "grid" && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                vendor={vendor}
                themeColor={themeColor}
                accentColor={accentColor}
                index={i}
                viewMode="grid"
              />
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && filteredProducts.length > 0 && (
          <div className="space-y-3">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                vendor={vendor}
                themeColor={themeColor}
                accentColor={accentColor}
                index={i}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Floating CTA (mobile) ── */}
      <div className="fixed bottom-4 inset-x-4 z-40 md:hidden">
        <ContactVendorButton
          vendorId={vendor.id}
          vendorUserId={vendor.user_id}
          variant="default"
          className="w-full h-12 shadow-2xl text-sm font-semibold rounded-2xl"
          label={`💬 Message ${vendor.business_name}`}
        />
      </div>

      {/* Desktop contact bar */}
      <div className="hidden md:block fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{vendor.business_name}</p>
            <p className="text-xs text-muted-foreground">{products.length} products available</p>
          </div>
          <ContactVendorButton
            vendorId={vendor.id}
            vendorUserId={vendor.user_id}
            variant="default"
            className="h-9 px-5 text-sm font-semibold shrink-0"
            label="💬 Message Vendor"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

// ── Product Card Component ────────────────────────────────────────────────────
const ProductCard = ({
  product,
  vendor,
  themeColor,
  accentColor,
  index,
  viewMode,
}: {
  product: Product;
  vendor: any;
  themeColor: string | null;
  accentColor: string | null;
  index: number;
  viewMode: "grid" | "list";
}) => {
  const priceColor = accentColor || themeColor || undefined;
  const delay = `${Math.min(index * 50, 400)}ms`;

  if (viewMode === "list") {
    return (
      <div
        className="store-card flex gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border/80 hover:shadow-sm transition-all"
        style={{
          animationDelay: delay,
          borderColor: themeColor ? `${themeColor}25` : undefined,
        }}
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/30">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🏷️
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">
            {product.name}
          </p>
          {product.category && (
            <Badge variant="outline" className="text-[10px] mt-0.5 mb-1 h-4 px-1.5">
              {product.category}
            </Badge>
          )}
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
              {product.description}
            </p>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col items-end justify-between shrink-0 gap-2">
          <span className="text-sm font-bold" style={{ color: priceColor }}>
            ₦{Number(product.price).toLocaleString()}
          </span>
          <ContactVendorButton
            vendorId={vendor.id}
            vendorUserId={vendor.user_id}
            variant="outline"
            className="h-7 text-xs px-2.5 rounded-lg"
            label="Buy"
          />
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div
      className="store-card store-product-card rounded-xl overflow-hidden border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{
        animationDelay: delay,
        borderColor: themeColor ? `${themeColor}30` : "hsl(var(--border) / 0.5)",
      }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: themeColor ? `${themeColor}10` : undefined }}
          >
            🏷️
          </div>
        )}

        {/* Hover overlay */}
        <div className="overlay absolute inset-0 bg-black/55 flex items-end p-2">
          <ContactVendorButton
            vendorId={vendor.id}
            vendorUserId={vendor.user_id}
            variant="default"
            className="w-full h-8 text-xs rounded-lg font-medium"
            label="💬 Message to Buy"
          />
        </div>

        {/* Category chip */}
        {product.category && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/85 backdrop-blur text-foreground border border-border/40 shadow-sm">
              {product.category}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className="p-2.5"
        style={themeColor ? { background: `${themeColor}06` } : {}}
      >
        <p className="text-xs font-semibold text-foreground truncate leading-tight mb-0.5">
          {product.name}
        </p>
        {product.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1 leading-snug">
            {product.description}
          </p>
        )}
        <span
          className="text-sm font-bold"
          style={{ color: priceColor || "hsl(var(--accent))" }}
        >
          ₦{Number(product.price).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default StorePage;
