import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, ShoppingBag, Star, Users, MapPin, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

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

const Index = () => {
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
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base" asChild>
                <Link to="/register-vendor">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Start Selling
                </Link>
              </Button>
            </div>
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
                { icon: <ShoppingBag className="h-8 w-8" />, title: "List Your Business", desc: "Add photos, description, and contact info. Get discovered by students." },
                { icon: <Star className="h-8 w-8" />, title: "Go Featured", desc: "Pay ₦2,000 to appear at the top of search results for 7 days." },
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

        {/* CTA */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to reach your campus?</h2>
            <p className="text-muted-foreground mb-8">
              Join hundreds of student entrepreneurs already selling on EduMarket.
            </p>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
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
