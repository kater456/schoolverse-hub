import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeSafe } from "@/lib/safeStorage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ContactVendorButton from "@/components/ContactVendorButton";
import {
  Package,
  CheckCircle2,
  Truck,
  Clock,
  User,
  Phone,
  MessageSquare,
  Loader2,
  Filter,
} from "lucide-react";

interface Props {
  vendor: any;
}

interface PreorderCustomer {
  preorder_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

interface PreorderItem {
  id: string;
  product_name: string;
  quantity: number;
}

interface Preorder {
  id: string;
  public_code: string;
  item_count: number;
  payment_status: "unpaid" | "paid" | string;
  delivery_status: "pending" | "delivered" | string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  preorder_items?: PreorderItem[];
  customer_info?: PreorderCustomer;
}

export default function VendorPreordersTab({ vendor }: Props) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Preorder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid" | "delivered">("all");

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "paid" | "delivered" | null;
    order: Preorder | null;
  }>({ open: false, type: null, order: null });

  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async () => {
    if (!vendor?.id) return;

    try {
      // 1. Fetch preorders & items
      const { data: preordersData, error: preordersError } = await supabase
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
          preorder_items (id, product_name, quantity)
        `)
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (preordersError) throw preordersError;

      // 2. Fetch customer contact lookup for vendor's preorders
      const { data: customerData, error: customerError } = await supabase.rpc(
        "get_preorder_customers",
        { _vendor_id: vendor.id }
      );

      if (customerError) {
        console.error("Failed to lookup preorder customers:", customerError);
      }

      const customerMap = new Map<string, PreorderCustomer>();
      if (customerData) {
        (customerData as PreorderCustomer[]).forEach((c) => {
          customerMap.set(c.preorder_id, c);
        });
      }

      const combined: Preorder[] = (preordersData || []).map((p: any) => ({
        ...p,
        customer_info: customerMap.get(p.id),
      }));

      setOrders(combined);
    } catch (err: any) {
      console.error("Error fetching vendor preorders:", err);
      toast({
        title: "Failed to load pre-orders",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (isRealtimeSafe() && vendor?.id) {
      const channel = supabase
        .channel(`vendor-preorders-${vendor.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "preorders",
            filter: `vendor_id=eq.${vendor.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [vendor?.id]);

  const handleUpdateStatus = async () => {
    const { type, order } = confirmDialog;
    if (!type || !order) return;

    setIsUpdating(true);

    try {
      const updates: any = {};
      if (type === "paid") {
        updates.payment_status = "paid";
      } else if (type === "delivered") {
        updates.delivery_status = "delivered";
      }

      const { error } = await supabase
        .from("preorders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: type === "paid" ? "Marked as Paid! 💳" : "Marked as Delivered! 🚚",
        description: `Order ${order.public_code} updated successfully`,
      });

      setConfirmDialog({ open: false, type: null, order: null });
      fetchOrders();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "unpaid") return o.payment_status === "unpaid";
    if (statusFilter === "paid") return o.payment_status === "paid" && o.delivery_status !== "delivered";
    if (statusFilter === "delivered") return o.delivery_status === "delivered";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" /> Pre-Order Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage incoming pre-orders, confirm customer payments, and track delivery status
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "unpaid", "paid", "delivered"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs capitalize shrink-0"
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
              <p className="font-medium text-foreground">No pre-orders found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {statusFilter === "all"
                  ? "When customers place pre-orders for your products, they will appear here."
                  : `No pre-orders matching the "${statusFilter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const customerName = order.customer_info
                  ? `${order.customer_info.first_name || ""} ${order.customer_info.last_name || ""}`.trim() || "Customer"
                  : "Customer";

                const customerPhone = order.customer_info?.phone;

                const itemsSummary =
                  order.preorder_items && order.preorder_items.length > 0
                    ? order.preorder_items
                        .map((i) => `${i.product_name} (x${i.quantity})`)
                        .join(", ")
                    : `${order.item_count} item(s)`;

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/60">
                          {order.public_code}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-accent" />
                          {customerName}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Items Ordered:</p>
                        <p className="font-medium text-foreground">{itemsSummary}</p>
                        <p className="text-xs text-muted-foreground pt-1">
                          Total items: <strong className="text-foreground">{order.item_count}</strong>
                        </p>
                      </div>

                      <div className="space-y-1 md:text-right">
                        <p className="text-xs text-muted-foreground">
                          Ordered: {new Date(order.created_at).toLocaleDateString()} at{" "}
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {order.paid_at && (
                          <p className="text-xs text-success flex items-center gap-1 md:justify-end">
                            <CheckCircle2 className="h-3 w-3" /> Paid:{" "}
                            {new Date(order.paid_at).toLocaleDateString()}
                          </p>
                        )}
                        {order.delivered_at && (
                          <p className="text-xs text-primary flex items-center gap-1 md:justify-end">
                            <Truck className="h-3 w-3" /> Delivered:{" "}
                            {new Date(order.delivered_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                      {/* Customer Contact Button */}
                      <div>
                        {customerPhone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                            asChild
                          >
                            <a
                              href={`https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hello ${customerName}, regarding your pre-order (${order.public_code}) for: ${itemsSummary}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> Contact Customer (WhatsApp)
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No contact info</span>
                        )}
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-2">
                        {order.payment_status === "unpaid" && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-success text-success-foreground hover:bg-success/90"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: "paid",
                                order,
                              })
                            }
                          >
                            Mark as Paid
                          </Button>
                        )}

                        {order.payment_status === "paid" && order.delivery_status !== "delivered" && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: "delivered",
                                order,
                              })
                            }
                          >
                            Mark as Delivered
                          </Button>
                        )}

                        {order.payment_status === "unpaid" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled
                            className="h-8 text-xs opacity-50 cursor-not-allowed"
                            title="Must be marked paid first"
                          >
                            Mark as Delivered
                          </Button>
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, type: null, order: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "paid" ? "Confirm Payment" : "Confirm Delivery"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "paid"
                ? `Are you sure you want to mark order ${confirmDialog.order?.public_code} as Paid? This confirms you have received payment from the customer.`
                : `Are you sure you want to mark order ${confirmDialog.order?.public_code} as Delivered? Once delivered, this status cannot be reverted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
