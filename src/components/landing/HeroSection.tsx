import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FloatingIcons from "@/components/landing/FloatingIcons";
import { ArrowRight, Play, CheckCircle2, School, ShoppingCart, Users } from "lucide-react";

const HeroSection = () => {
  const stats = [
    { value: "500+", label: "Schools" },
    { value: "50K+", label: "Students" },
    { value: "$2M+", label: "Transactions" },
  ];

  const features = [
    "Multi-school marketplace",
    "Direct payment to schools",
    "White-label branding",
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm mb-8 animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground">
                Trusted by 500+ Schools Worldwide
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-tight mb-6 animate-fade-in-up">
              The Complete{" "}
              <span className="relative">
                <span className="text-gradient-accent bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">
                  School Portal
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent/30" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
              {" "}& Marketplace
            </h1>

            {/* Description */}
            <p className="text-lg lg:text-xl text-primary-foreground/70 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Empower your school with an independent portal, marketplace, and
              payment system. Complete white-label solution with direct school payments.
            </p>

            {/* Feature List */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-primary-foreground/80">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="font-display text-2xl lg:text-3xl font-bold text-primary-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-fade-in-up lg:animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
            {/* Main Dashboard Card */}
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              {/* Dashboard Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/80" />
                  <div className="w-3 h-3 rounded-full bg-warning/80" />
                  <div className="w-3 h-3 rounded-full bg-success/80" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">School Portal Dashboard</span>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-6 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <School className="h-6 w-6 text-primary mb-2" />
                    <div className="font-display text-xl font-bold text-foreground">12</div>
                    <div className="text-xs text-muted-foreground">Active Stores</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <ShoppingCart className="h-6 w-6 text-accent mb-2" />
                    <div className="font-display text-xl font-bold text-foreground">348</div>
                    <div className="text-xs text-muted-foreground">Orders Today</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <Users className="h-6 w-6 text-success mb-2" />
                    <div className="font-display text-xl font-bold text-foreground">2.4K</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="h-32 rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-border/50 flex items-end justify-around px-4 pb-4">
                  <div className="w-8 bg-primary/30 rounded-t-lg" style={{ height: "40%" }} />
                  <div className="w-8 bg-primary/50 rounded-t-lg" style={{ height: "65%" }} />
                  <div className="w-8 bg-primary/70 rounded-t-lg" style={{ height: "45%" }} />
                  <div className="w-8 bg-accent/70 rounded-t-lg" style={{ height: "85%" }} />
                  <div className="w-8 bg-primary/60 rounded-t-lg" style={{ height: "55%" }} />
                  <div className="w-8 bg-primary/40 rounded-t-lg" style={{ height: "70%" }} />
                </div>

                {/* Recent Orders */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Recent Orders</div>
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20" />
                        <div>
                          <div className="text-sm font-medium text-foreground">Order #{1234 + i}</div>
                          <div className="text-xs text-muted-foreground">2 items</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-success">$24.99</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-6 bg-card rounded-xl shadow-xl border border-border p-4 animate-float hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Payment Received</div>
                  <div className="text-xs text-muted-foreground">$156.00 • Just now</div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-xl border border-border p-4 animate-float hidden lg:block" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                  <School className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">New School Joined</div>
                  <div className="text-xs text-muted-foreground">Lincoln Academy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;