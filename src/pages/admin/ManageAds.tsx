import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Image, Film, Megaphone } from "lucide-react";

const DURATIONS = [
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "60 seconds", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "5 minutes", value: 300 },
];

const ManageAds = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const { toast } = useToast();

  const fetchAds = async () => {
    const { data } = await supabase
      .from("platform_ads")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setAds(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const isVideo = file.type.startsWith("video");
    const ext = file.name.split(".").pop();
    const path = `ads/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("vendor-media").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);

    const { error } = await supabase.from("platform_ads").insert({
      title: title.trim() || "New Ad",
      media_url: urlData.publicUrl,
      media_type: isVideo ? "video" : "image",
      display_duration: parseInt(duration),
      is_active: true,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ad uploaded!" });
      setTitle("");
      fetchAds();
    }
    setUploading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("platform_ads").update({ is_active: !current } as any).eq("id", id);
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  };

  const updateDuration = async (id: string, dur: number) => {
    await supabase.from("platform_ads").update({ display_duration: dur } as any).eq("id", id);
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, display_duration: dur } : a));
    toast({ title: "Duration updated" });
  };

  const deleteAd = async (id: string) => {
    await supabase.from("platform_ads").delete().eq("id", id);
    setAds((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Ad removed" });
  };

  return (
    <AdminLayout>
      <h1 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
        <Megaphone className="h-5 w-5" /> Manage Ads
      </h1>

      {/* Upload New Ad */}
      <Card className="border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-base">Upload New Ad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Title (optional)</Label>
              <Input placeholder="e.g. Back to School Sale" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Display Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Media (Image or Video)</Label>
            <div className="mt-2">
              <Button variant="outline" disabled={uploading} asChild className="cursor-pointer">
                <label>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {uploading ? "Uploading..." : "Choose File"}
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Ads */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : ads.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No ads yet. Upload your first ad above.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <Card key={ad.id} className="border-border/50 overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {ad.media_type === "video" ? (
                  <video src={ad.media_url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 left-2">
                  {ad.media_type === "video" ? (
                    <Badge variant="secondary"><Film className="h-3 w-3 mr-1" />Video</Badge>
                  ) : (
                    <Badge variant="secondary"><Image className="h-3 w-3 mr-1" />Image</Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className={ad.is_active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                    {ad.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm truncate">{ad.title || "Untitled"}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Active</Label>
                    <Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad.id, ad.is_active)} />
                  </div>
                  <Select value={String(ad.display_duration)} onValueChange={(v) => updateDuration(ad.id, parseInt(v))}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove Ad
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageAds;
