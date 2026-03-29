import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, ShoppingBag, ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import FloatingIcons from "@/components/landing/FloatingIcons";
import { CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
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
  const [schools, setSchools] = useState<ApprovedSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Show splash once per session
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("splash_shown");
  });

  const handleSplashEnter = () => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  };

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from("schools")
        .select("id, name, logo_url, address")
        .order("name");
      setSchools(data || []);
      setLoadingSchools(false);
    };
    fetchSchools();

    const channel = supabase
      .channel("homepage-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, () => {
        fetchSchools();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_ads" }, () => {})
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const howItWorks = [
    {
      title: "Sign Up",
      description: "Create your account in seconds. Choose your school and get started on the platform.",
    },
    {
      title: "List Your Business",
      description: "Add photos, description, pricing, and contact info. Complete payment to activate your vendor space.",
    },
    {
      title: "Get Discovered",
      description: "Students on your campus can find your business, view your products, and contact you directly.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Splash — sits on top of everything, shows once per session */}
      {showSplash && <SplashScreen onEnter={handleSplashEnter} />}

      <Navbar />
      <main>
        {/* Hero */}
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
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base" asChild>
                <Link to="/browse">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Marketplace
                </Link>
              </Button>
              <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 border-0 text-base font-semibold" asChild>
                <Link to="/register-vendor">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Start Selling
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* All Schools */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Schools on Campus Market</h2>
            <p className="text-muted-foreground text-center mb-8">Campuses currently on the platform</p>
            {loadingSchools ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
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
                        {school.address && (
                          <span className="text-xs text-muted-foreground mt-1 block">{school.address}</span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
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

        {/* How It Works */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How It Works</h2>
            <Accordion type="single" collapsible defaultValue="step-0" className="space-y-3">
              {howItWorks.map((step, i) => (
                <AccordionItem key={i} value={`step-${i}`} className="bg-card border border-border/50 rounded-xl px-6">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                        {i + 1}
                      </span>
                      {step.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {step.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to reach your campus?</h2>
            <p className="text-muted-foreground mb-8">
              Join hundreds of student entrepreneurs already selling on Campus Market.
            </p>
            <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 font-semibold" asChild>
              <Link to="/register-vendor">
                Register as Vendor <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />

      {/* AI Chatbox — only visible to logged-in users */}
      <AIChatbox />
    </div>
  );
};

export default Index;
