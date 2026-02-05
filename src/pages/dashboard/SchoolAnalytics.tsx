import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign } from "lucide-react";

const SchoolAnalytics = () => {
  const metrics = [
    { label: "Monthly Revenue", value: "$8,420", change: "+32%", icon: DollarSign },
    { label: "Total Orders", value: "342", change: "+18%", icon: ShoppingCart },
    { label: "Conversion Rate", value: "24%", change: "+5%", icon: TrendingUp },
    { label: "Avg Order Value", value: "$24.62", change: "+8%", icon: BarChart3 },
  ];

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your school's marketplace performance</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.label} className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metric.value}</div>
                <p className="text-xs text-success mt-1">{metric.change} from last month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground">Chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground">Chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchoolAnalytics;
