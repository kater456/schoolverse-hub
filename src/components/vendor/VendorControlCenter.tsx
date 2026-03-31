import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ToggleLeft, Package, ShoppingCart, Truck, MessageCircle,
  Save, Loader2, Radio, AlertCircle, CheckCircle2, Clock,
  Zap, Info,
} from "lucide-react";

interface Props {
  vendor: any;
  onUpdate: (updates: any) => void;
}

const STOCK_OPTIONS = [
  { value: "in_stock",      label: "In Stock",       color: "bg-success/20 text-success",      icon: "✅" },
  { value: "low_stock",     label: "Low Stock",      color: "bg-warning/20 text-warning",      icon: "⚠️" },
  { value: "out_of_stock",  label: "Out of Stock",   color: "bg-destructive/20 text-destructive", icon: "❌" },
  { value: "made_to_order", label: "Made to Order",  color: "bg-primary/20 text-primary",      icon: "🛠️" },
];

const VendorControlCenter = ({ vendor, onUpdate }: Props) => {
  const { toast } = useToast();

  const [isOpen,           setIsOpen]           = useState(vendor.is_open          ?? true);
  const [stockStatus,      setStockStatus]      = useState(vendor.stock_status     ?? "in_stock");
  const [acceptsOrders,    setAcceptsOrders]    = useState(vendor.accepts_orders   ?? true);
  const [deliveryAvailable,setDeliveryAvailable] = useState(vendor.delivery_available ?? false);
  const [whatsappOrders,   setWhatsappOrders]   = useState(vendor.whatsapp_orders  ?? false);
  const [statusMessage,    setStatusMessage]    = useState(vendor.status_message   ?? "");
  const [saving,           setSaving]           = useState(false);
  const [savingKey,        setSavingKey]        = useState<string | null>(null);

  const patch = async (key: string, value: any, label: string) => {
    setSavingKey(key);
    const { error } = await supabase
      .from("vendors")
      .update({ [key]: value } as any)
      .eq("id", vendor.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onUpdate({ [key]: value });
      toast({ title: `${label} updated ✅` });
    }
    setSavingKey(null);
  };

  const saveStatusMessage = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({ status_message: statusMessage.trim() || null } as any)
      .eq("id", vendor.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onUpdate({ status_message: statusMessage.trim() || null });
      toast({ title: "Status message saved ✅" });
    }
    setSaving(false);
  };

  const currentStock = STOCK_OPTIONS.find((s) => s.value === stockStatus);

  return (
    <div className="space-y-5 max-w-xl">

      {/* Live status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        isOpen
          ? "bg-success/10 border-success/30"
          : "bg-muted border-border/50"
      }`}>
        <div className={`w-3 h-3 rounded-full shrink-0 ${isOpen ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isOpen ? "Your business is OPEN" : "Your business is CLOSED"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOpen ? "Customers can see and contact you" : "You appear offline to customers"}
          </p>
        </div>
        <Switch
          checked={isOpen}
          onCheckedChange={(val) => { setIsOpen(val); patch("is_open", val, "Business status"); }}
          disabled={savingKey === "is_open"}
        />
      </div>

      {/* Stock Status */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" /> Stock Status
          </CardTitle>
          <CardDescription className="text-xs">
            Let customers know your current stock situation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {STOCK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStockStatus(opt.value);
                  patch("stock_status", opt.value, "Stock status");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  stockStatus === opt.value
                    ? `${opt.color} border-current`
                    : "border-border/50 text-muted-foreground hover:border-accent/50 hover:bg-muted/50"
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          {savingKey === "stock_status" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Business Toggles */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Business Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">

          {/* Accept Orders */}
          <div className="flex items-center justify-between py-3 first:pt-0">
            <div className="flex items-start gap-2.5">
              <ShoppingCart className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label className="text-sm font-medium">Accepting Orders</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle off if you're fully booked or on break
                </p>
              </div>
            </div>
            <Switch
              checked={acceptsOrders}
              onCheckedChange={(val) => { setAcceptsOrders(val); patch("accepts_orders", val, "Order acceptance"); }}
              disabled={savingKey === "accepts_orders"}
            />
          </div>

          {/* Delivery */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-start gap-2.5">
              <Truck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label className="text-sm font-medium">Delivery Available</Label>
                <p className="text-xs text-muted-foreground">
                  Do you deliver to customers on campus?
                </p>
              </div>
            </div>
            <Switch
              checked={deliveryAvailable}
              onCheckedChange={(val) => { setDeliveryAvailable(val); patch("delivery_available", val, "Delivery setting"); }}
              disabled={savingKey === "delivery_available"}
            />
          </div>

          {/* WhatsApp Orders */}
          <div className="flex items-center justify-between py-3 last:pb-0">
            <div className="flex items-start gap-2.5">
              <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label className="text-sm font-medium">WhatsApp Orders</Label>
                <p className="text-xs text-muted-foreground">
                  Accept orders via WhatsApp message
                </p>
              </div>
            </div>
            <Switch
              checked={whatsappOrders}
              onCheckedChange={(val) => { setWhatsappOrders(val); patch("whatsapp_orders", val, "WhatsApp orders"); }}
              disabled={savingKey === "whatsapp_orders"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Status Message */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" /> Status Message
          </CardTitle>
          <CardDescription className="text-xs">
            A short message shown on your profile — e.g. "Back tomorrow", "DM for bulk orders"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder='e.g. "Back by 3pm today" or "Bulk orders available"'
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
            maxLength={80}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{statusMessage.length}/80</span>
            <Button
              size="sm"
              onClick={saveStatusMessage}
              disabled={saving || statusMessage === (vendor.status_message ?? "")}
              className="h-8"
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary card showing what customers see */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-accent" /> What customers see on your profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className={isOpen ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
              {isOpen ? "🟢 Open" : "⚫ Closed"}
            </Badge>
            <Badge className={currentStock?.color}>
              {currentStock?.icon} {currentStock?.label}
            </Badge>
            {acceptsOrders
              ? <Badge className="bg-primary/10 text-primary">🛒 Taking orders</Badge>
              : <Badge variant="secondary">🚫 Not taking orders</Badge>}
            {deliveryAvailable && <Badge className="bg-accent/20 text-accent">🚚 Delivers</Badge>}
            {whatsappOrders  && <Badge className="bg-success/20 text-success">💬 WhatsApp orders</Badge>}
            {statusMessage.trim() && (
              <Badge variant="outline" className="italic">"{statusMessage.trim()}"</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorControlCenter;
