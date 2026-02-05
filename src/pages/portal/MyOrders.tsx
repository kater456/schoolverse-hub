import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Eye } from "lucide-react";

const MyOrders = () => {
  const orders = [
    { id: "#2847", items: ["School Uniform Set", "Science Textbook"], total: "$70.00", status: "Delivered", date: "Feb 1, 2026" },
    { id: "#2839", items: ["Lunch Meal Deal x5"], total: "$40.00", status: "Processing", date: "Jan 28, 2026" },
    { id: "#2821", items: ["Sports Kit"], total: "$30.00", status: "Delivered", date: "Jan 15, 2026" },
  ];

  return (
    <DashboardLayout userRole="user">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track your order history</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
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
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{order.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.items.join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="font-medium">{order.total}</div>
                      <div className="text-xs text-muted-foreground">{order.date}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.status === "Delivered"
                          ? "bg-success/20 text-success"
                          : "bg-primary/20 text-primary"
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

export default MyOrders;
