import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for small schools getting started",
      price: 49,
      period: "month",
      features: [
        "Up to 500 students",
        "Basic marketplace",
        "Email support",
        "Standard branding",
        "Payment processing",
        "Basic analytics",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      description: "Ideal for growing schools",
      price: 149,
      period: "month",
      features: [
        "Up to 2,000 students",
        "Advanced marketplace",
        "Priority support",
        "Custom branding",
        "Custom domain",
        "Advanced analytics",
        "API access",
        "Multi-admin support",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large institutions",
      price: 399,
      period: "month",
      features: [
        "Unlimited students",
        "Full marketplace suite",
        "24/7 dedicated support",
        "White-label solution",
        "Multiple domains",
        "Custom integrations",
        "SLA guarantee",
        "Dedicated account manager",
        "On-premise option",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-mesh" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              Simple Pricing
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Plans That Scale With You
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your school. All plans include a 14-day
            free trial with no credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-card rounded-2xl border ${
                plan.popular
                  ? "border-accent shadow-xl shadow-accent/10 scale-105"
                  : "border-border"
              } p-8 flex flex-col`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-accent-foreground font-semibold text-sm rounded-full shadow-lg">
                    <Zap className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center mt-0.5">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={plan.popular ? "hero" : "outline"}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Trusted by educational institutions worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {["Lincoln Academy", "Greenfield School", "Oak Valley High", "Maple Grove"].map(
              (school) => (
                <div
                  key={school}
                  className="font-display text-lg font-semibold text-muted-foreground"
                >
                  {school}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;