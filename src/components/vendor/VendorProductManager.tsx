import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Package, Loader2, Image as ImageIcon, DollarSign } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

interface VendorProductManagerProps {
  vendorId: string;
  schoolId: string;
}

interface VendorProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
}

const VendorProductManager = ({ vendorId, schoolId }: VendorProductManagerProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
  });

  const fetchData = async () => {
    const [productsRes, imagesRes] = await Promise.all([
      (supabase as any).from("vendor_products").select("*").eq("vendor_id", vendorId).order("display_order", { ascending: true }),
      supabase.from("vendor_images").select("*").eq("vendor_id", vendorId).order("display_order", { ascending: true }),
    ]);
    setProducts(productsRes.data || []);
    setImages(imagesRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [vendorId]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "", image_url: "" });
    setEditingProduct(null);
  };

  const openAdd = () => { resetForm(); setShowDialog(true); };
  const openEdit = (p: VendorProduct) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price.toString(),
      category: p.category || "",
      image_url: p.image_url || "",
    });
    setShowDialog(true);
  };

  const uploadProductImage = async (file: File) => {
    setUploading(true);
    const compressed = await compressImage(file, 800);
    const path = `${vendorId}/products/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("vendor-media").upload(path, compressed);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { toast({ title: "Product name is required", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      vendor_id: vendorId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      category: form.category.trim() || null,
      image_url: form.image_url || null,
      display_order: editingProduct ? editingProduct.display_order : products.length,
    };

    let error;
    if (editingProduct) {
      const res = await (supabase as any).from("vendor_products").update(payload).eq("id", editingProduct.id);
      error = res.error;
    } else {
      const res = await (supabase as any).from("vendor_products").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingProduct ? "Product updated!" : "Product added!" });
      // Send notification
      await (supabase as any).from("vendor_notifications").insert({
        vendor_id: vendorId,
        type: "product",
        title: editingProduct ? "Product Updated" : "New Product Added",
        message: `Your product "${form.name.trim()}" has been ${editingProduct ? "updated" : "added"} successfully.`,
        is_read: false,
      });
      fetchData();
      setShowDialog(false);
      resetForm();
    }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    await (supabase as any).from("vendor_products").delete().eq("id", id);
    toast({ title: "Product removed" });
    fetchData();
  };

  const toggleActive = async (p: VendorProduct) => {
    await (supabase as any).from("vendor_products").update({ is_active: !p.is_active }).eq("id", p.id);
    toast({ title: p.is_active ? "Product hidden" : "Product visible" });
    fetchData();
  };

  // Legacy image upload (for gallery images without prices)
  const uploadGalleryImage = async (file: File) => {
    setUploading(true);
    const compressed = await compressImage(file, 800);
    const path = `${vendorId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("vendor-media").upload(path, compressed);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);
    await supabase.from("vendor_images").insert({
      vendor_id: vendorId,
      image_url: urlData.publicUrl,
      is_primary: images.length === 0,
      display_order: images.length,
    } as any);
    toast({ title: "Image uploaded!" });
    fetchData();
    setUploading(false);
  };

  const deleteImage = async (id: string) => {
    await supabase.from("vendor_images").delete().eq("id", id);
    toast({ title: "Image removed" });
    fetchData();
  };

  const setPrimary = async (id: string) => {
    await supabase.from("vendor_images").update({ is_primary: false } as any).eq("vendor_id", vendorId);
    await supabase.from("vendor_images").update({ is_primary: true } as any).eq("id", id);
    toast({ title: "Primary image updated" });
    fetchData();
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Products with Prices */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Products & Pricing
          </CardTitle>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products yet. Add your first product with a price!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((p) => (
                <div key={p.id} className={`relative rounded-xl border border-border/50 overflow-hidden transition-all hover:shadow-md ${!p.is_active ? "opacity-60" : ""}`}>
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{p.name}</h4>
                        {p.category && <Badge variant="outline" className="text-[10px] mt-1">{p.category}</Badge>}
                      </div>
                      <span className="text-sm font-bold text-success shrink-0">
                        ₦{p.price.toLocaleString()}
                      </span>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(p)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(p)}>
                        {p.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Images (legacy) */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Gallery Images
          </CardTitle>
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Image
              </span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadGalleryImage(file);
            }} />
          </label>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <p className="text-sm text-center py-4 text-muted-foreground">No gallery images yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border/50">
                  <img src={img.image_url} alt="" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {!img.is_primary && (
                      <Button size="sm" variant="secondary" onClick={() => setPrimary(img.id)} className="text-[10px] h-6 px-2">
                        Primary
                      </Button>
                    )}
                    <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => deleteImage(img.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {img.is_primary && (
                    <Badge className="absolute top-1 left-1 bg-accent text-accent-foreground text-[9px] px-1.5">Primary</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Shawarma Combo" />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₦)</Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Food, Fashion" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Product Image</Label>
              {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
              <label className="cursor-pointer">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><ImageIcon className="h-4 w-4 mr-2" /> {form.image_url ? "Change Image" : "Upload Image"}</>}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadProductImage(file);
                }} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={saveProduct} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorProductManager;
