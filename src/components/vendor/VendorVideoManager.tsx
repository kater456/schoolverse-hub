import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Trash2, Loader2 } from "lucide-react";

interface VendorVideoManagerProps {
  vendorId: string;
  reelsEnabled: boolean;
}

const VendorVideoManager = ({ vendorId, reelsEnabled }: VendorVideoManagerProps) => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from("vendor_videos")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    setVideos(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchVideos(); }, [vendorId]);

  const uploadVideo = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum video size is 50MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${vendorId}/videos/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("vendor-media")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);

    const { error } = await supabase.from("vendor_videos").insert({
      vendor_id: vendorId,
      video_url: urlData.publicUrl,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Video uploaded!" });
      fetchVideos();
    }
    setUploading(false);
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("vendor_videos").delete().eq("id", id);
    toast({ title: "Video removed" });
    fetchVideos();
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Film className="h-4 w-4" /> Reels / Videos
          {reelsEnabled && <Badge className="bg-accent text-accent-foreground text-[10px]">Reels Active</Badge>}
        </CardTitle>
        <label className="cursor-pointer">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Upload Video
            </span>
          </Button>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadVideo(file);
          }} />
        </label>
      </CardHeader>
      <CardContent>
        {!reelsEnabled && (
          <div className="mb-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            💡 Your Reels access is not yet enabled. Videos you upload will appear here but won't show in the public Reels feed until an admin enables your Reels access.
          </div>
        )}
        {videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No videos yet. Upload a video of yourself or your products!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((v) => (
              <div key={v.id} className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted">
                <video src={v.video_url} className="w-full aspect-video object-cover" controls preload="metadata" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteVideo(v.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="p-2">
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorVideoManager;
