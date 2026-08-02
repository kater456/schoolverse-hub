import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Flame, ImagePlus, Pencil } from "lucide-react";
import { dealLabel } from "@/hooks/useLiveDeals";
import { LiveCountdown } from "@/components/promo/LiveCountdown";

interface Deal {
  id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  deal_price: number | null;
  discount_type: string;
  discount_value: number | null;
  image_url: string | null;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  originalPrice: "",
  dealPrice: "",
  startsAt: "",
  expiresAt: "",
  imageUrl: "" as string | null,
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const VendorDealManager = ({ vendorId }: { vendorId: string }) => {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const set = (k: keyof typeof emptyForm, v: string | null) =>
    setForm((f) => ({ ...f, [k]: v as any }));

  const fetchDeals = async () => {
    const { data } = await (supabase as any)
      .from("vendor_deals")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    setDeals(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [vendorId]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (deal: Deal) => {
    setEditingId(deal.id);
    setForm({
      title: deal.title,
      description: deal.description || "",
      discountType: deal.discount_type || "percentage",
      discountValue: deal.discount_value != null ? String(deal.discount_value) : "",
      originalPrice: deal.original_price != null ? String(deal.original_price) : "",
      dealPrice: deal.deal_price != null ? String(deal.deal_price) : "",
      startsAt: deal.starts_at ? toLocalInput(deal.starts_at) : "",
      expiresAt: deal.expires_at ? toLocalInput(deal.expires_at) : "",
      imageUrl: deal.image_url,
    });
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${vendorId}/deals/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("vendor-media").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("vendor-media").getPublicUrl(path);
      set("imageUrl", data.publicUrl);
    }
    setUploading(false);
  };

  const saveDeal = async () => {
    if (!form.title || !form.expiresAt) {
      toast({ title: "Title and end date are required", variant: "destructive" });
      return;
    }
    const startIso = form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString();
    const endIso = new Date(form.expiresAt).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast({ title: "End date must be after the start date", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      vendor_id: vendorId,
      title: form.title,
      description: form.description || null,
      discount_type: form.discountType,
      discount_value: form.discountValue ? parseFloat(form.discountValue) : null,
      original_price: form.originalPrice ? parseFloat(form.originalPrice) : null,
      deal_price: form.dealPrice ? parseFloat(form.dealPrice) : null,
      image_url: form.imageUrl || null,
      starts_at: startIso,
      expires_at: endIso,
    };

    const { error } = editingId
      ? await (supabase.from("vendor_deals") as any).update(payload).eq("id", editingId)
      : await (supabase.from("vendor_deals") as any).insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Deal updated" : "Deal created! 🔥" });
      if (!editingId) {
        supabase.functions.invoke("notify-super-admin", {
          body: {
            type: "new_deal",
            title: `New deal: ${form.title}`,
            message: `A vendor just posted a new deal "${form.title}" ending ${new Date(endIso).toLocaleDateString()}.`,
          },
        }).catch(() => {});
      }
      resetForm();
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
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: !active } : d)));
  };

  const statusOf = (deal: Deal) => {
    const now = Date.now();
    if (!deal.is_active) return { label: "Paused", variant: "secondary" as const };
    if (new Date(deal.expires_at).getTime() <= now) return { label: "Expired", variant: "destructive" as const };
    if (new Date(deal.starts_at).getTime() > now) return { label: "Scheduled", variant: "outline" as const };
    return { label: "Live", variant: "default" as const };
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" /> Deals &amp; Promotions
        </h3>
        <Button size="sm" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          <Plus className="h-4 w-4 mr-1" /> New Deal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 20% off all items" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Deal details..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount type</Label>
                <Select value={form.discountType} onValueChange={(v) => set("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount (₦)</SelectItem>
                    <SelectItem value="custom_text">Custom text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount value</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  disabled={form.discountType === "custom_text"}
                  onChange={(e) => set("discountValue", e.target.value)}
                  placeholder={form.discountType === "fixed" ? "₦0" : "0%"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Original Price</Label>
                <Input type="number" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} placeholder="₦0" />
              </div>
              <div>
                <Label>Deal Price</Label>
                <Input type="number" value={form.dealPrice} onChange={(e) => set("dealPrice", e.target.value)} placeholder="₦0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts At</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank to start now.</p>
              </div>
              <div>
                <Label>Ends At *</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Promo image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Promo preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="text-xs font-medium cursor-pointer text-primary hover:underline">
                  {uploading ? "Uploading…" : form.imageUrl ? "Change image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                  />
                </label>
                {form.imageUrl && (
                  <button className="text-xs text-destructive" onClick={() => set("imageUrl", "")}>Remove</button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveDeal} disabled={saving || uploading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? "Save changes" : "Create Deal"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No deals yet. Create one to attract more customers!
        </p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const status = statusOf(deal);
            return (
              <Card key={deal.id} className={deal.is_active ? "" : "opacity-60"}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {deal.image_url && (
                      <img src={deal.image_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{deal.title}</h4>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge className="bg-orange-500 text-white border-0">{dealLabel(deal)}</Badge>
                      </div>
                      {deal.description && (
                        <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                        {deal.original_price && (
                          <span className="line-through text-muted-foreground">₦{Number(deal.original_price).toLocaleString()}</span>
                        )}
                        {deal.deal_price && (
                          <span className="font-bold text-green-600">₦{Number(deal.deal_price).toLocaleString()}</span>
                        )}
                        <LiveCountdown expiresAt={deal.expires_at} variant="simple" />
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(deal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorDealManager;
