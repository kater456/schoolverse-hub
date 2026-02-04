import {
  Building2,
  ShoppingBag,
  CreditCard,
  Palette,
  Globe,
  Shield,
  Users,
  Zap,
  BarChart3,
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Building2,
      title: "Multi-Tenant Architecture",
      description:
        "Each school operates with complete independence. Separate portals, data, and admin controls ensure privacy and autonomy.",
      color: "primary",
    },
    {
      icon: ShoppingBag,
      title: "School Marketplace",
      description:
        "Enable schools to sell food, books, supplies, and services. Full inventory management and order tracking included.",
      color: "accent",
    },
    {
      icon: CreditCard,
      title: "Direct Payment Routing",
      description:
        "Payments go directly to school accounts. No middleman access to transaction details. Complete financial independence.",
      color: "success",
    },
    {
      icon: Palette,
      title: "White-Label Branding",
      description:
        "Schools customize logos, colors, and themes. Each portal reflects the school's unique identity and branding.",
      color: "warning",
    },
    {
      icon: Globe,
      title: "Custom Domain Support",
      description:
        "Connect your own domain with automatic SSL. Multi-domain routing ensures secure and scalable access.",
      color: "primary",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Email verification, role-based access, encrypted passwords, and secure sessions protect all users.",
      color: "accent",
    },
    {
      icon: Users,
      title: "Role Management",
      description:
        "Super Admin, School Admin, Staff, and Student roles with strict permission boundaries and access controls.",
      color: "success",
    },
    {
      icon: Zap,
      title: "Automated Onboarding",
      description:
        "New schools register, select a plan, pay, and get instant access to their fully configured portal.",
      color: "warning",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description:
        "Comprehensive dashboards for sales, orders, and user activity. Each school sees only their data.",
      color: "primary",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: {
        bg: "bg-primary/10",
        text: "text-primary",
        border: "group-hover:border-primary/30",
      },
      accent: {
        bg: "bg-accent/10",
        text: "text-accent",
        border: "group-hover:border-accent/30",
      },
      success: {
        bg: "bg-success/10",
        text: "text-success",
        border: "group-hover:border-success/30",
      },
      warning: {
        bg: "bg-warning/10",
        text: "text-warning",
        border: "group-hover:border-warning/30",
      },
    };
    return colors[color] || colors.primary;
  };

  return (
    <section id="features" className="py-24 bg-mesh bg-background relative overflow-hidden">
      {/* Section Header */}
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              Powerful Features
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything Your School Needs
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete platform designed for educational institutions. From
            marketplace to management, we've got you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const colorClasses = getColorClasses(feature.color);
            return (
              <div
                key={feature.title}
                className={`group relative p-6 lg:p-8 bg-card rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${colorClasses.border}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colorClasses.bg} mb-5`}
                >
                  <feature.icon className={`h-6 w-6 ${colorClasses.text}`} />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-transparent group-hover:from-primary/[0.02] group-hover:to-accent/[0.02] transition-all duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;