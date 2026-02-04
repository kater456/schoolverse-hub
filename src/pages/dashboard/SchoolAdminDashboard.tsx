import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
} from "lucide-react";

const SchoolAdminDashboard = () => {
  const stats = [
    {
      title: "Today's Orders",
      value: "47",
      change: "+18%",
      trend: "up",
      icon: ShoppingCart,
      color: "primary",
    },
    {
      title: "Total Students",
      value: "1,234",
      change: "+5%",
      trend: "up",
      icon: Users,
      color: "success",
    },
    {
      title: "Revenue (Month)",
      value: "$8,420",
      change: "+32%",
      trend: "up",
      icon: DollarSign,
      color: "accent",
    },
    {
      title: "Products",
      value: "156",
      change: "+3",
      trend: "up",
      icon: Package,
      color: "warning",
    },
  ];

  const recentOrders = [
    { id: "#2847", customer: "Emma Wilson", items: 3, total: "$45.99", status: "Completed" },
    { id: "#2846", customer: "James Brown", items: 1, total: "$12.50", status: "Processing" },
    { id: "#2845", customer: "Sophie Davis", items: 5, total: "$78.00", status: "Completed" },
    { id: "#2844", customer: "Michael Lee", items: 2, total: "$34.25", status: "Pending" },
  ];

  const topProducts = [
    { name: "School Uniform Set", sales: 142, revenue: "$4,260" },
    { name: "Science Textbook", sales: 98, revenue: "$2,450" },
    { name: "Lunch Meal Deal", sales: 234, revenue: "$1,872" },
    { name: "Sports Kit", sales: 67, revenue: "$2,010" },
  ];

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              School Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's what's happening with your school today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Store
            </Button>
            <Button variant="accent">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
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

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-foreground">{order.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer} • {order.items} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">{order.total}</div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "Completed"
                            ? "bg-success/20 text-success"
                            : order.status === "Processing"
                            ? "bg-primary/20 text-primary"
                            : "bg-warning/20 text-warning"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Products</CardTitle>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.sales} sales
                      </div>
                    </div>
                    <div className="font-semibold text-foreground">{product.revenue}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Add Product", icon: Package, variant: "default" as const },
                { label: "Manage Orders", icon: ShoppingCart, variant: "outline" as const },
                { label: "View Reports", icon: ArrowUpRight, variant: "outline" as const },
                { label: "School Settings", icon: Users, variant: "outline" as const },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="h-auto py-4 flex-col gap-2"
                >
                  <action.icon className="h-5 w-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SchoolAdminDashboard;