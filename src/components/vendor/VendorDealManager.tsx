import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Flame } from "lucide-react";

interface Deal {
  id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  deal_price: number | null;
  expires_at: string;
  is_active: boolean;
}

const VendorDealManager = ({ vendorId }: { vendorId: string }) => {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("vendor_deals")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }) as any;
    setDeals(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [vendorId]);

  const createDeal = async () => {
    if (!title || !expiresAt) {
      toast({ title: "Title and expiry date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("vendor_deals") as any).insert({
      vendor_id: vendorId,
      title,
      description: description || null,
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      deal_price: dealPrice ? parseFloat(dealPrice) : null,
      expires_at: new Date(expiresAt).toISOString(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal created! 🔥" });
      setTitle(""); setDescription(""); setOriginalPrice(""); setDealPrice(""); setExpiresAt("");
      setShowForm(false);
      fetchDeals();
    }
    setSaving(false);
  };

  const deleteDeal = async (id: string) => {
    await (supabase.from("vendor_deals") as any).delete().eq("id", id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Deal removed" });
  };

  const toggleDeal = async (id: string, active: boolean) => {
    await (supabase.from("vendor_deals") as any).update({ is_active: !active }).eq("id", id);
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, is_active: !active } : d));
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" /> Deals & Promotions
        </h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Deal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20% off all items" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deal details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Original Price</Label>
                <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="₦0" />
              </div>
              <div>
                <Label>Deal Price</Label>
                <Input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} placeholder="₦0" />
              </div>
            </div>
            <div>
              <Label>Expires At *</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={createDeal} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Create Deal
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No deals yet. Create one to attract more customers!</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <Card key={deal.id} className={!deal.is_active ? "opacity-60" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{deal.title}</h4>
                      <Badge variant={deal.is_active ? "default" : "secondary"}>
                        {deal.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {new Date(deal.expires_at) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    {deal.description && <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      {deal.original_price && (
                        <span className="line-through text-muted-foreground">₦{deal.original_price.toLocaleString()}</span>
                      )}
                      {deal.deal_price && (
                        <span className="font-bold text-green-600">₦{deal.deal_price.toLocaleString()}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Expires: {new Date(deal.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleDeal(deal.id, deal.is_active)}>
                      {deal.is_active ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDeal(deal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorDealManager;
