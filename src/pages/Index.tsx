import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, ShoppingBag, Star, Users, ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import FloatingIcons from "@/components/landing/FloatingIcons";
import { CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Snacks": "🍔",
  "Fashion & Clothing": "👗",
  "Hair & Beauty": "💇",
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

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from("schools")
        .select("id, name, logo_url, address")
        .or("payment_confirmed.eq.true,trial_ends_at.gt.now()")
        .order("name");
      setSchools(data || []);
      setLoadingSchools(false);
    };
    fetchSchools();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-24 pb-16 px-4 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Your Campus <span className="text-gradient">Marketplace</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Discover student businesses, buy &amp; sell within your university community. Free to list, easy to find.
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

        {/* Approved Schools */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Schools on Campus Market</h2>
            <p className="text-muted-foreground text-center mb-8">Verified campuses currently on the platform</p>
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
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Users className="h-8 w-8" />, title: "Sign Up Free", desc: "Create your account in seconds. No fees for basic listings." },
                { icon: <ShoppingBag className="h-8 w-8" />, title: "List Your Business", desc: "Add photos, description, pricing, and contact info. Get discovered by students." },
                { icon: <Star className="h-8 w-8" />, title: "Go Featured", desc: "Pay to appear at the top of search results and unlock Reels access." },
              ].map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-4" id="pricing">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Go Pro</h2>
            <p className="text-muted-foreground text-center mb-10">Boost your visibility and reach more customers</p>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Top Listing Only */}
              <Card className="border-accent/30 relative">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-1">Top Listing</h3>
                  <p className="text-sm text-muted-foreground mb-4">Appear at the top of search results for 7 days</p>
                  <div className="space-y-1 mb-4">
                    <p className="text-2xl font-bold text-foreground">🇳🇬 ₦1,000</p>
                    <p className="text-lg font-semibold text-foreground">🇬🇭 GH₵12</p>
                  </div>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <Link to="/vendor-dashboard">Activate Now</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Top Listing + Reels */}
              <Card className="border-orange-500/50 relative ring-2 ring-orange-500/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</span>
                </div>
                <CardContent className="p-6 pt-8">
                  <h3 className="text-lg font-bold mb-1">Top Listing + Reels</h3>
                  <p className="text-sm text-muted-foreground mb-4">Top search + upload short video reels for 7 days</p>
                  <div className="space-y-1 mb-4">
                    <p className="text-2xl font-bold text-foreground">🇳🇬 ₦2,000</p>
                    <p className="text-lg font-semibold text-foreground">🇬🇭 GH₵24</p>
                  </div>
                  <Button className="w-full bg-orange-500 text-white hover:bg-orange-600" asChild>
                    <Link to="/vendor-dashboard">Activate Now</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
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
    </div>
  );
};

export default Index;
