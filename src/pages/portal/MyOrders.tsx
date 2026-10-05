import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, Clock, CheckCircle2, Truck, Store, AlertCircle } from "lucide-react";

interface PreorderItem {
  id: string;
  product_name: string;
  quantity: number;
}

interface PreorderRecord {
  id: string;
  public_code: string;
  item_count: number;
  payment_status: "unpaid" | "paid" | string;
  delivery_status: "pending" | "delivered" | string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  vendors?: {
    business_name: string;
    id: string;
  } | null;
  preorder_items?: PreorderItem[];
}

const MyOrders = () => {
  const { user } = useAuth();
  const [preorders, setPreorders] = useState<PreorderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreorders = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("preorders")
          .select(`
            id,
            public_code,
            item_count,
            payment_status,
            delivery_status,
            created_at,
            paid_at,
            delivered_at,
            vendors (id, business_name),
            preorder_items (id, product_name, quantity)
          `)
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching preorders:", error);
        } else {
          setPreorders((data as any) || []);
        }
      } catch (err) {
        console.error("Failed to load preorders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreorders();
  }, [user]);

  return (
    <DashboardLayout userRole="user">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Pre-Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track your pre-orders, payment confirmations, and delivery updates
          </p>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Pre-Order History
            </CardTitle>
            <CardDescription className="text-xs">
              Orders placed with campus pre-order vendors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : preorders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Package className="h-6 w-6" />
                </div>
                <p className="font-medium text-foreground">No pre-orders found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When you pre-order items from campus vendors, your order codes and payment statuses will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {preorders.map((order) => {
                  const vendorName = order.vendors?.business_name || "Campus Vendor";
                  const itemsList =
                    order.preorder_items && order.preorder_items.length > 0
                      ? order.preorder_items
                          .map((i) => `${i.product_name} (x${i.quantity})`)
                          .join(", ")
                      : `${order.item_count} item(s)`;

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/50">
                            {order.public_code}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Store className="h-3.5 w-3.5 text-accent" />
                            {vendorName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              order.payment_status === "paid"
                                ? "bg-success/20 text-success border-success/30"
                                : "bg-warning/20 text-warning border-warning/30"
                            }
                          >
                            {order.payment_status === "paid" ? "Paid" : "Unpaid"}
                          </Badge>

                          <Badge
                            className={
                              order.delivery_status === "delivered"
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {order.delivery_status === "delivered" ? "Delivered" : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{itemsList}</p>
                          <p className="text-xs text-muted-foreground">
                            Ordered: {new Date(order.created_at).toLocaleDateString()} at{" "}
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-0.5 sm:text-right">
                          {order.paid_at && (
                            <p className="text-success flex items-center gap-1 sm:justify-end">
                              <CheckCircle2 className="h-3 w-3" /> Paid{" "}
                              {new Date(order.paid_at).toLocaleDateString()}
                            </p>
                          )}
                          {order.delivered_at && (
                            <p className="text-primary flex items-center gap-1 sm:justify-end">
                              <Truck className="h-3 w-3" /> Delivered{" "}
                              {new Date(order.delivered_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyOrders;
