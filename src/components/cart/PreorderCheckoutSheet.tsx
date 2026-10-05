import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PreorderCartItem } from "@/hooks/usePreorderCart";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ContactVendorButton from "@/components/ContactVendorButton";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string | null;
  vendorName: string | null;
  paymentInstructions?: string | null;
  items: PreorderCartItem[];
  totalItemCount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export default function PreorderCheckoutSheet({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  paymentInstructions,
  items,
  totalItemCount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    id: string;
    publicCode: string;
    itemCount: number;
    itemsSummary: string;
  } | null>(null);

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to place a pre-order",
        variant: "destructive",
      });
      return;
    }

    if (!vendorId || items.length === 0) {
      toast({
        title: "Cart empty",
        description: "Add items to your cart before placing an order",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadItems = items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.rpc("place_preorder", {
        _vendor_id: vendorId,
        _items: payloadItems,
      });

      if (error) {
        throw error;
      }

      const res = data && (data as any)[0];
      if (!res) {
        throw new Error("Failed to place pre-order. Please try again.");
      }

      const itemsSummary = items
        .map((item) => `${item.product_name} x${item.quantity}`)
        .join(", ");

      setPlacedOrder({
        id: res.id,
        publicCode: res.public_code,
        itemCount: res.item_count,
        itemsSummary,
      });

      onClearCart();
      toast({
        title: "Pre-order placed! 🎉",
        description: `Your pre-order code is ${res.public_code}`,
      });
    } catch (err: any) {
      toast({
        title: "Order failed",
        description: err.message || "Could not place pre-order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setPlacedOrder(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-accent" />
            Pre-order Checkout
          </SheetTitle>
          <SheetDescription>
            {vendorName ? `Ordering from ${vendorName}` : "Your pre-order cart"}
          </SheetDescription>
        </SheetHeader>

        {placedOrder ? (
          <div className="py-6 space-y-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>

            <div>
              <Badge variant="outline" className="text-sm font-mono px-3 py-1 bg-muted">
                Code: {placedOrder.publicCode}
              </Badge>
              <h3 className="text-xl font-bold mt-2 text-foreground">Pre-Order Received!</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Total items: {placedOrder.itemCount} item(s)
              </p>
            </div>

            {paymentInstructions && (
              <Card className="w-full text-left border-accent/30 bg-accent/5">
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-accent" />
                    Payment Instructions
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {paymentInstructions}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="w-full text-left border-border/50 bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Payment is made directly to the vendor, not on Campus Market. Your order shows as
                    Paid once the vendor confirms.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="w-full space-y-3 pt-2">
              <ContactVendorButton
                vendorId={vendorId!}
                vendorName={vendorName || "Vendor"}
                productName={placedOrder.itemsSummary}
                storeName={vendorName || undefined}
                customMessage={`Hello ${vendorName || "Vendor"}, I placed a pre-order (Code: ${
                  placedOrder.publicCode
                }) for: ${placedOrder.itemsSummary}. Total items: ${
                  placedOrder.itemCount
                }. Please send payment instructions.`}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" /> Message vendor to pay
              </ContactVendorButton>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 flex-1 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-foreground">Your pre-order cart is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add products from pre-order vendors to place an order
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-5 flex-1 flex flex-col">
            {/* Cart item list */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-card-foreground"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <p className="text-sm font-medium leading-tight">{item.product_name}</p>
                    {item.price !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        ₦{item.price.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-none"
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-none"
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveItem(item.product_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total items summary */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-sm font-semibold">
              <span>Total Items:</span>
              <Badge variant="secondary" className="text-xs font-bold">
                {totalItemCount} item(s)
              </Badge>
            </div>

            {/* Vendor Payment instructions if available */}
            {paymentInstructions && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-accent" />
                    Vendor Payment Instructions
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {paymentInstructions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment note */}
            <div className="p-3 rounded-lg border border-border bg-muted/40 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-snug">
                Payment is made directly to the vendor, not on Campus Market. Your order shows as Paid
                once the vendor confirms.
              </p>
            </div>

            <SheetFooter className="pt-2">
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing pre-order…
                  </>
                ) : (
                  `Place pre-order (${totalItemCount} items)`
                )}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
