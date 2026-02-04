import { UserPlus, CreditCard, Settings, Rocket } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      icon: UserPlus,
      step: "01",
      title: "Register Your School",
      description:
        "Create your school account with basic information. Verify your email to activate your administrator access.",
    },
    {
      icon: CreditCard,
      step: "02",
      title: "Choose a Plan",
      description:
        "Select a subscription plan that fits your school size. Secure payment processing with instant activation.",
    },
    {
      icon: Settings,
      step: "03",
      title: "Customize Your Portal",
      description:
        "Add your logo, colors, and branding. Configure your marketplace products and payment settings.",
    },
    {
      icon: Rocket,
      step: "04",
      title: "Go Live",
      description:
        "Your school portal is ready! Students and parents can now browse and purchase from your marketplace.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-secondary/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-6">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              Simple Process
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-muted-foreground">
            Our automated onboarding process gets your school up and running
            quickly. No technical expertise required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative bg-card rounded-2xl border border-border p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Step Number */}
                <div className="absolute -top-4 left-8 px-3 py-1 bg-accent text-accent-foreground font-display font-bold text-sm rounded-full">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;