import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, User, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

interface Props {
  vendor: any;
  onUpdate: (updates: any) => void;
}

const VendorProfilePicture = ({ vendor, onUpdate }: Props) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(vendor.profile_image_url || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 600, 0.85);
      const path = `${vendor.id}/profile-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("vendor-media")
        .upload(path, compressed, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("vendor-media").getPublicUrl(path);
      const newUrl = pub.publicUrl;

      const { error } = await (supabase as any)
        .from("vendors")
        .update({ profile_image_url: newUrl })
        .eq("id", vendor.id);
      if (error) throw error;

      setUrl(newUrl);
      onUpdate({ profile_image_url: newUrl });
      toast({ title: "Profile picture updated ✅" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    setUploading(true);
    const { error } = await (supabase as any)
      .from("vendors")
      .update({ profile_image_url: null })
      .eq("id", vendor.id);
    if (!error) {
      setUrl(null);
      onUpdate({ profile_image_url: null });
      toast({ title: "Profile picture removed" });
    }
    setUploading(false);
  };

  const initials = (vendor.business_name || "V").slice(0, 2).toUpperCase();

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Profile Picture
        </CardTitle>
        <CardDescription>
          A photo of you or your store logo — shown on your storefront. This is separate from your product photos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={url || undefined} alt="Profile" className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-2 flex-1">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button asChild disabled={uploading} variant="default" size="sm">
                <span>
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />{url ? "Change" : "Upload"} Picture</>
                  )}
                </span>
              </Button>
            </label>
            {url && (
              <Button onClick={handleRemove} variant="ghost" size="sm" disabled={uploading} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG or PNG. Max 5MB. Square images look best.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorProfilePicture;
