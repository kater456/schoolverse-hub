import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Eye } from "lucide-react";

const Orders = () => {
  const orders = [
    { id: "#2847", customer: "Emma Wilson", items: 3, total: "$45.99", status: "Completed", date: "Today, 2:30 PM" },
    { id: "#2846", customer: "James Brown", items: 1, total: "$12.50", status: "Processing", date: "Today, 1:15 PM" },
    { id: "#2845", customer: "Sophie Davis", items: 5, total: "$78.00", status: "Completed", date: "Today, 11:00 AM" },
    { id: "#2844", customer: "Michael Lee", items: 2, total: "$34.25", status: "Pending", date: "Yesterday" },
    { id: "#2843", customer: "Sarah Johnson", items: 4, total: "$56.00", status: "Completed", date: "Yesterday" },
  ];

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track all orders</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-10" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{order.id}</div>
                      <div className="text-sm text-muted-foreground">{order.customer} • {order.items} items</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="font-medium">{order.total}</div>
                      <div className="text-xs text-muted-foreground">{order.date}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.status === "Completed"
                          ? "bg-success/20 text-success"
                          : order.status === "Processing"
                          ? "bg-primary/20 text-primary"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {order.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
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

export default Orders;
