import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import VendorVideoGenerator from "@/components/vendor/VendorVideoGenerator";

interface Props {
  vendorId: string;
  reelsEnabled: boolean;
  vendor?: any; // full vendor object needed for Veo gating
}

const VendorVideoManager = ({ vendorId, reelsEnabled, vendor }: Props) => {
  const { toast }   = useToast();
  const [videos, setVideos]       = useState<any[]>([]);
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
    const ext  = file.name.split(".").pop();
    const path = `${vendorId}/videos/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("vendor-media").upload(path, file);
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

  const isUpgraded = vendor?.is_store_upgraded &&
    vendor?.store_upgrade_expires_at &&
    new Date(vendor.store_upgrade_expires_at) > new Date();

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Tabs defaultValue="my-videos" className="space-y-4">
      <TabsList className="h-9">
        <TabsTrigger value="my-videos" className="text-xs gap-1.5">
          <Film className="h-3.5 w-3.5" /> My Reels
        </TabsTrigger>
        <TabsTrigger value="ai-generate" className="text-xs gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> AI Generate
          {vendor?.is_verified && isUpgraded && (
            <Badge className="ml-1 bg-accent/20 text-accent border-accent/30 text-[9px] h-4 px-1">New</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── My Reels tab ── */}
      <TabsContent value="my-videos">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4" /> Reels / Videos
              {reelsEnabled && (
                <Badge className="bg-accent text-accent-foreground text-[10px]">Reels Active</Badge>
              )}
            </CardTitle>
            <label className="cursor-pointer">
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <Plus className="h-4 w-4 mr-1" />
                  }
                  Upload Video
                </span>
              </Button>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }}
              />
            </label>
          </CardHeader>

          <CardContent>
            {!reelsEnabled && (
              <div className="mb-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                💡 Your Reels access is not yet enabled. Videos you upload will appear here but won't show
                in the public Reels feed until an admin enables your Reels access.
              </div>
            )}

            {videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Film className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No videos yet.</p>
                <p className="text-xs mt-1 text-muted-foreground/70">
                  Upload a video or use the AI Generate tab to create one with Veo 3.1.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((v) => (
                  <div
                    key={v.id}
                    className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted"
                  >
                    <video
                      src={v.video_url}
                      className="w-full aspect-video object-cover"
                      controls
                      preload="metadata"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => deleteVideo(v.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                      {v.ai_generated && (
                        <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20 gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── AI Generate tab ── */}
      <TabsContent value="ai-generate">
        <VendorVideoGenerator vendorId={vendorId} vendor={vendor} />
      </TabsContent>
    </Tabs>
  );
};

export default VendorVideoManager;
