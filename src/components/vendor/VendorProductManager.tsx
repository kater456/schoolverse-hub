import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Package, Loader2, Image as ImageIcon } from "lucide-react";

interface VendorProductManagerProps {
  vendorId: string;
  schoolId: string;
}

const VendorProductManager = ({ vendorId, schoolId }: VendorProductManagerProps) => {
  const { toast } = useToast();
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ caption: "", isPrimary: false });

  const fetchImages = async () => {
    const { data } = await supabase
      .from("vendor_images")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("display_order", { ascending: true });
    setImages(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchImages(); }, [vendorId]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${vendorId}/${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("vendor-media")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);

    const { error } = await supabase.from("vendor_images").insert({
      vendor_id: vendorId,
      image_url: urlData.publicUrl,
      is_primary: images.length === 0,
      display_order: images.length,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Image uploaded!" });
      fetchImages();
      setShowAdd(false);
    }
    setUploading(false);
  };

  const deleteImage = async (id: string) => {
    await supabase.from("vendor_images").delete().eq("id", id);
    toast({ title: "Image removed" });
    fetchImages();
  };

  const setPrimary = async (id: string) => {
    await supabase.from("vendor_images").update({ is_primary: false }).eq("vendor_id", vendorId);
    await supabase.from("vendor_images").update({ is_primary: true }).eq("id", id);
    toast({ title: "Primary image updated" });
    fetchImages();
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" /> Product Images
        </CardTitle>
        <label className="cursor-pointer">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Image
            </span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
          }} />
        </label>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No product images yet. Upload your first image!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border/50">
                <img src={img.image_url} alt="" className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.is_primary && (
                    <Button size="sm" variant="secondary" onClick={() => setPrimary(img.id)} className="text-xs">
                      Set Primary
                    </Button>
                  )}
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteImage(img.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {img.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px]">Primary</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorProductManager;
