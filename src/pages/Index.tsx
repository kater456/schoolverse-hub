import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, ShoppingBag, ArrowRight, GraduationCap, Loader2, Plus, Store } from "lucide-react";
import FloatingIcons from "@/components/landing/FloatingIcons";
import { CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AIChatbox from "@/components/AIChatbox";
import SplashScreen from "@/components/SplashScreen";

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Snacks": "🍔",
  "Fashion & Clothing": "👗",
  "Hair & Beauty": "💇",
  "Toiletries & Hygiene": "🧴",
  "Perfumes & Fragrances": "🌸",
  "Tech & Gadgets": "📱",
  "Stationery & Printing": "📚",
  "Tutoring Services": "📖",
  "Transportation": "🚗",
  "Other Services": "🔧",
};

interface ApprovedSchool {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schools, setSchools] = useState<ApprovedSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Vendor status for smart CTA buttons
  const [isApprovedVendor, setIsApprovedVendor] = useState(false);
  const [isPendingVendor,  setIsPendingVendor]  = useState(false);
  const [vendorId,         setVendorId]         = useState<string | null>(null);
  const [checkingVendor,   setCheckingVendor]   = useState(false);

  // Show splash once per session
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splash_shown"));
  const handleSplashEnter = () => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  };

  // ── Swipe-left → Reels ──────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    // Only count as a left swipe if mostly horizontal and >60px
    if (deltaX > 60 && deltaX > deltaY * 1.5) navigate("/reels");
    touchStartX.current = null;
    touchStartY.current = null;
  }, [navigate]);
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase.from("schools").select("id, name, logo_url, address").order("name");
      setSchools(data || []);
      setLoadingSchools(false);
    };
    fetchSchools();

    const channel = supabase.channel("homepage-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, fetchSchools)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_ads" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Check vendor status so we can show smart buttons
  useEffect(() => {
    if (!user) {
      setIsApprovedVendor(false);
      setIsPendingVendor(false);
      setVendorId(null);
      return;
    }
    const checkVendor = async () => {
      setCheckingVendor(true);
      const { data } = await supabase
        .from("vendors")
        .select("id, is_approved")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setVendorId(data.id);
        setIsApprovedVendor(!!data.is_approved);
        setIsPendingVendor(!data.is_approved);
      } else {
        setVendorId(null);
        setIsApprovedVendor(false);
        setIsPendingVendor(false);
      }
      setCheckingVendor(false);
    };
    checkVendor();
  }, [user]);

  const howItWorks = [
    { title: "Sign Up", description: "Create your account in seconds. Choose your school and get started on the platform." },
    { title: "List Your Business", description: "Add photos, description, pricing, and contact info. Complete payment to activate your vendor space." },
    { title: "Get Discovered", description: "Students on your campus can find your business, view your products, and contact you directly." },
  ];

  // ── Smart CTA: hero section ──────────────────────────────────────────────────
  const HeroCTA = () => {
    if (checkingVendor) {
      return (
        <div className="flex items-center gap-2 text-primary-foreground/60 text-sm py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }

    // Approved vendor
    if (user && isApprovedVendor) {
      return (
        <>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base" asChild>
            <Link to="/browse"><Search className="mr-2 h-5 w-5" />Browse Marketplace</Link>
          </Button>
          <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 border-0 text-base font-semibold" asChild>
            <Link to="/vendor-dashboard"><Plus className="mr-2 h-5 w-5" />Add Product</Link>
          </Button>
        </>
      );
    }

    // Pending vendor (registered but not approved yet)
    if (user && isPendingVendor) {
      return (
        <>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base" asChild>
            <Link to="/browse"><Search className="mr-2 h-5 w-5" />Browse Marketplace</Link>
          </Button>
          <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 border-0 text-base font-semibold" asChild>
            <Link to="/vendor-dashboard"><Store className="mr-2 h-5 w-5" />Add Store / Upgrade</Link>
          </Button>
        </>
      );
    }

    // Logged-in non-vendor or not logged in
    return (
      <>
        <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base" asChild>
          <Link to="/browse"><Search className="mr-2 h-5 w-5" />Browse Marketplace</Link>
        </Button>
        <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 border-0 text-base font-semibold" asChild>
          <Link to="/register-vendor"><ShoppingBag className="mr-2 h-5 w-5" />Start Selling</Link>
        </Button>
      </>
    );
  };

  // ── Smart CTA: bottom section ────────────────────────────────────────────────
  const BottomCTA = () => {
    if (user && isApprovedVendor) {
      return (
        <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 font-semibold" asChild>
          <Link to="/vendor-dashboard"><Plus className="mr-2 h-5 w-5" />Add Product <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </Button>
      );
    }
    if (user && isPendingVendor) {
      return (
        <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 font-semibold" asChild>
          <Link to="/vendor-dashboard"><Store className="mr-2 h-5 w-5" />Add Store / Upgrade <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </Button>
      );
    }
    return (
      <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 font-semibold" asChild>
        <Link to="/register-vendor">Register as Vendor <ArrowRight className="ml-2 h-5 w-5" /></Link>
      </Button>
    );
  };

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {showSplash && <SplashScreen onEnter={handleSplashEnter} />}

      <Navbar />
      <main>
        {/* ── Hero ── */}
        <section className="relative pt-24 pb-16 px-4 bg-gradient-hero text-primary-foreground overflow-hidden">
          <FloatingIcons />
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Your Campus <span className="text-gradient">Marketplace</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Discover student businesses, buy &amp; sell within your university community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <HeroCTA />
            </div>
            {/* Swipe hint — mobile only */}
            <p className="mt-6 text-xs text-primary-foreground/40 md:hidden animate-pulse select-none">
              ← Swipe left for Reels
            </p>
          </div>
        </section>

        {/* ── Schools ── */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Schools on Campus Market</h2>
            <p className="text-muted-foreground text-center mb-8">Campuses currently on the platform</p>
            {loadingSchools ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : schools.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No schools available yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {schools.map((school) => (
                  <Link key={school.id} to={`/browse?school=${school.id}`}>
                    <Card className="hover-lift cursor-pointer text-center border-border/50">
                      <CardContent className="p-6">
                        {school.logo_url ? (
                          <img src={school.logo_url} alt={school.name} className="w-12 h-12 mx-auto mb-3 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground block">{school.name}</span>
                        {school.address && <span className="text-xs text-muted-foreground mt-1 block">{school.address}</span>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Browse by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {CATEGORIES.map((cat) => (
                <Link key={cat} to={`/browse?category=${encodeURIComponent(cat)}`}>
                  <Card className="hover-lift cursor-pointer text-center border-border/50">
                    <CardContent className="p-6">
                      <span className="text-3xl mb-2 block">{CATEGORY_ICONS[cat] || "📦"}</span>
                      <span className="text-sm font-medium text-foreground">{cat}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How It Works</h2>
            <Accordion type="single" collapsible defaultValue="step-0" className="space-y-3">
              {howItWorks.map((step, i) => (
                <AccordionItem key={i} value={`step-${i}`} className="bg-card border border-border/50 rounded-xl px-6">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold">{i + 1}</span>
                      {step.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">{step.description}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {isApprovedVendor ? "Keep your store growing!" : "Ready to reach your campus?"}
            </h2>
            <p className="text-muted-foreground mb-8">
              {isApprovedVendor
                ? "Add new products, manage your store and reach more students."
                : "Join hundreds of student entrepreneurs already selling on Campus Market."}
            </p>
            <BottomCTA />
          </div>
        </section>
      </main>

      <Footer />
      <AIChatbox />
    </div>
  );
};

export default Index;
