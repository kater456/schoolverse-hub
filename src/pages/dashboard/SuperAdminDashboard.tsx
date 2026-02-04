import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const SuperAdminDashboard = () => {
  const stats = [
    {
      title: "Total Schools",
      value: "127",
      change: "+12%",
      trend: "up",
      icon: Building2,
      color: "primary",
    },
    {
      title: "Active Users",
      value: "15,432",
      change: "+8%",
      trend: "up",
      icon: Users,
      color: "success",
    },
    {
      title: "Monthly Revenue",
      value: "$48,250",
      change: "+23%",
      trend: "up",
      icon: CreditCard,
      color: "accent",
    },
    {
      title: "Platform Growth",
      value: "18%",
      change: "-2%",
      trend: "down",
      icon: TrendingUp,
      color: "warning",
    },
  ];

  const recentSchools = [
    { name: "Lincoln Academy", plan: "Professional", status: "Active", date: "Today" },
    { name: "Oak Valley High", plan: "Enterprise", status: "Active", date: "Yesterday" },
    { name: "Maple Grove School", plan: "Starter", status: "Pending", date: "2 days ago" },
    { name: "Cedar Heights", plan: "Professional", status: "Active", date: "3 days ago" },
  ];

  return (
    <DashboardLayout userRole="super_admin">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all schools on the platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    stat.color === "primary"
                      ? "bg-primary/10"
                      : stat.color === "success"
                      ? "bg-success/10"
                      : stat.color === "accent"
                      ? "bg-accent/10"
                      : "bg-warning/10"
                  }`}
                >
                  <stat.icon
                    className={`h-4 w-4 ${
                      stat.color === "primary"
                        ? "text-primary"
                        : stat.color === "success"
                        ? "text-success"
                        : stat.color === "accent"
                        ? "text-accent"
                        : "text-warning"
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </span>
                  <span
                    className={`text-sm font-medium flex items-center ${
                      stat.trend === "up" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Schools */}
        <Card>
          <CardHeader>
            <CardTitle>Recent School Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSchools.map((school) => (
                <div
                  key={school.name}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{school.name}</div>
                      <div className="text-sm text-muted-foreground">{school.plan} Plan</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        school.status === "Active"
                          ? "bg-success/20 text-success"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {school.status}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">{school.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;