import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, X } from "lucide-react";

const Subscriptions = () => {
  const plans = [
    { name: "Starter", price: "$29", period: "/month", schools: 23, features: ["Up to 500 students", "Basic marketplace", "Email support"] },
    { name: "Professional", price: "$79", period: "/month", schools: 67, features: ["Up to 2000 students", "Full marketplace", "Priority support", "Custom branding"] },
    { name: "Enterprise", price: "$199", period: "/month", schools: 37, features: ["Unlimited students", "Full marketplace", "24/7 support", "Custom branding", "Custom domain", "API access"] },
  ];

  const recentPayments = [
    { school: "Lincoln Academy", plan: "Professional", amount: "$79.00", date: "Today", status: "Paid" },
    { school: "Oak Valley High", plan: "Enterprise", amount: "$199.00", date: "Yesterday", status: "Paid" },
    { school: "Maple Grove School", plan: "Starter", amount: "$29.00", date: "2 days ago", status: "Pending" },
  ];

  return (
    <DashboardLayout userRole="super_admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage subscription plans and payments</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <span className="text-2xl font-bold text-primary">{plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.schools}</span>
                  <span className="text-muted-foreground ml-2">active schools</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{payment.school}</div>
                      <div className="text-sm text-muted-foreground">{payment.plan} Plan</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{payment.amount}</div>
                    <div className="text-xs text-muted-foreground">{payment.date}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      payment.status === "Paid" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Subscriptions;
