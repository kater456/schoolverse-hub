import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";
import {
  Loader2, Plus, Trash2, Image, Megaphone, Globe, GraduationCap,
  Eye, MousePointerClick, Link, Calendar, Upload, X, CheckSquare, Square,
  Edit, ExternalLink,
} from "lucide-react";

const ManageAds = () => {
  const { toast } = useToast();
  const [ads,      setAds]      = useState<any[]>([]);
  const [schools,  setSchools]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);

  // Form state
  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [advertiserName, setAdvertiserName] = useState("");
  const [linkUrl,        setLinkUrl]        = useState("");
  const [targetType,     setTargetType]     = useState<"all" | "schools">("all");
  const [selectedSchools,setSelectedSchools]= useState<string[]>([]);
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imagePreview,   setImagePreview]   = useState<string | null>(null);
  const [endsAt,         setEndsAt]         = useState("");
  const [position,       setPosition]       = useState<"popup" | "banner" | "both">("popup");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [adsRes, schoolsRes] = await Promise.all([
      supabase.from("platform_ads").select("*").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name").order("name"),
    ]);
    setAds((adsRes.data as any) || []);
    setSchools(schoolsRes.data || []);
    setLoading(false);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleSchool = (id: string) => {
    setSelectedSchools((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const submitAd = async () => {
    if (!title.trim()) { toast({ title: "Ad title is required", variant: "destructive" }); return; }
    if (targetType === "schools" && selectedSchools.length === 0) {
      toast({ title: "Select at least one school", variant: "destructive" }); return;
    }

    setSaving(true);
    let imageUrl = null;

    if (imageFile) {
      setUploading(true);
      const compressed = await compressImage(imageFile, 1200, 0.85);
      const path = `ads/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vendor-media").upload(path, compressed, { upsert: true });
      if (uploadError) {
        toast({ title: "Image upload failed", description: uploadError.message, variant: "destructive" });
        setSaving(false); setUploading(false); return;
      }
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
      setUploading(false);
    }

    const { error } = await supabase.from("platform_ads").insert({
      title: title.trim(),
      description: description.trim() || null,
      advertiser_name: advertiserName.trim() || null,
      link_url: linkUrl.trim() || null,
      image_url: imageUrl,
      target_type: targetType,
      school_ids: targetType === "schools" ? selectedSchools : [],
      is_active: true,
      display_position: position,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      click_count: 0,
      view_count: 0,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ad created! 🎉" });
      // Reset form
      setTitle(""); setDescription(""); setAdvertiserName(""); setLinkUrl("");
      setTargetType("all"); setSelectedSchools([]); setImageFile(null);
      setImagePreview(null); setEndsAt(""); setPosition("popup");
      fetchAll();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("platform_ads").update({ is_active: !current } as any).eq("id", id);
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
    toast({ title: !current ? "Ad activated" : "Ad paused" });
  };

  const deleteAd = async (id: string) => {
    await supabase.from("platform_ads").delete().eq("id", id);
    setAds((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Ad deleted" });
  };

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name || id;

  const activeAds   = ads.filter((a) => a.is_active);
  const inactiveAds = ads.filter((a) => !a.is_active);

  const AdCard = ({ ad }: { ad: any }) => {
    const isExpired = ad.ends_at && new Date(ad.ends_at) < new Date();
    return (
      <Card className={`border-border/50 overflow-hidden ${isExpired ? "opacity-60" : ""}`}>
        {/* Image */}
        <div className="aspect-video bg-muted relative">
          {ad.image_url ? (
            <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Image className="h-8 w-8" />
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge className={ad.is_active && !isExpired
              ? "bg-success/90 text-success-foreground text-[10px]"
              : "bg-muted text-muted-foreground text-[10px]"}>
              {isExpired ? "Expired" : ad.is_active ? "Live" : "Paused"}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {ad.target_type === "all"
                ? <><Globe className="h-2.5 w-2.5 mr-0.5" />All Users</>
                : <><GraduationCap className="h-2.5 w-2.5 mr-0.5" />{ad.school_ids?.length} School{ad.school_ids?.length !== 1 ? "s" : ""}</>}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[10px] capitalize">{ad.display_position}</Badge>
          </div>
        </div>

        <CardContent className="p-3 space-y-2">
          <p className="font-semibold text-sm truncate">{ad.title}</p>
          {ad.advertiser_name && (
            <p className="text-xs text-muted-foreground">by {ad.advertiser_name}</p>
          )}
          {ad.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
          )}

          {/* Schools targeted */}
          {ad.target_type === "schools" && ad.school_ids?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ad.school_ids.slice(0, 2).map((sid: string) => (
                <Badge key={sid} variant="outline" className="text-[10px]">{schoolName(sid)}</Badge>
              ))}
              {ad.school_ids.length > 2 && (
                <Badge variant="outline" className="text-[10px]">+{ad.school_ids.length - 2} more</Badge>
              )}
            </div>
          )}

          {/* Analytics */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(ad.view_count || 0).toLocaleString()} views</span>
            <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{(ad.click_count || 0).toLocaleString()} clicks</span>
            {ad.view_count > 0 && (
              <span className="text-success">{Math.round(((ad.click_count || 0) / ad.view_count) * 100)}% CTR</span>
            )}
          </div>

          {ad.ends_at && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isExpired ? "Ended" : "Ends"}: {new Date(ad.ends_at).toLocaleDateString()}
            </p>
          )}
          {ad.link_url && (
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-primary flex items-center gap-1 hover:underline truncate">
              <ExternalLink className="h-3 w-3 shrink-0" />{ad.link_url}
            </a>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-1">
              <Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad.id, ad.is_active)} />
              <Label className="text-xs cursor-pointer">{ad.is_active ? "Live" : "Paused"}</Label>
            </div>
            <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => deleteAd(ad.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-accent" /> Ad Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create targeted or platform-wide ads with full analytics
          </p>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Ads",   value: ads.length,       color: "text-foreground" },
              { label: "Live",        value: activeAds.length, color: "text-success" },
              { label: "Total Views", value: ads.reduce((s, a) => s + (a.view_count || 0), 0).toLocaleString(), color: "text-primary" },
              { label: "Total Clicks",value: ads.reduce((s, a) => s + (a.click_count || 0), 0).toLocaleString(), color: "text-accent" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Ad Form */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent" /> Create New Ad
            </CardTitle>
            <CardDescription>Fill in the details and choose your targeting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Basic info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ad Title <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Back to School Sale" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Advertiser Name</Label>
                <Input placeholder="e.g. Campus Store Ltd" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ad Description</Label>
              <Textarea
                placeholder="Additional information shown when user clicks the ad…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Link className="h-3.5 w-3.5" /> Click URL (optional)</Label>
                <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> End Date (optional)</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Ad Image</Label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-40 rounded-lg object-cover border border-border" />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-accent transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload ad image (recommended: 1200×628px)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                </label>
              )}
            </div>

            {/* Display position */}
            <div className="space-y-2">
              <Label>Display Position</Label>
              <div className="flex gap-2">
                {(["popup", "banner", "both"] as const).map((p) => (
                  <button key={p} onClick={() => setPosition(p)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                      position === p
                        ? "bg-accent text-accent-foreground border-accent"
                        : "border-border/50 text-muted-foreground hover:border-accent/50"
                    }`}>
                    {p === "popup" ? "Popup" : p === "banner" ? "Banner" : "Both"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {position === "popup" ? "Shows as a popup overlay on page load"
                  : position === "banner" ? "Shows as a banner strip at the top of pages"
                  : "Shows as both popup and banner"}
              </p>
            </div>

            {/* Targeting */}
            <div className="space-y-3 border border-border/50 rounded-xl p-4">
              <Label className="text-sm font-semibold">Ad Targeting</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTargetType("all"); setSelectedSchools([]); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all ${
                    targetType === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/50"
                  }`}>
                  <Globe className="h-4 w-4" /> Platform-wide
                </button>
                <button
                  onClick={() => setTargetType("schools")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all ${
                    targetType === "schools"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/50"
                  }`}>
                  <GraduationCap className="h-4 w-4" /> School-specific
                </button>
              </div>

              {targetType === "all" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
                  <Globe className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This ad will be shown to <strong>all users</strong> across every school on the platform.
                  </p>
                </div>
              )}

              {targetType === "schools" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Select schools — ad shows only to users from these campuses:
                  </p>
                  {schools.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No schools found</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {schools.map((school) => {
                        const selected = selectedSchools.includes(school.id);
                        return (
                          <button
                            key={school.id}
                            onClick={() => toggleSchool(school.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                              selected
                                ? "bg-primary/10 border-primary text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/30"
                            }`}>
                            {selected
                              ? <CheckSquare className="h-4 w-4 shrink-0" />
                              : <Square      className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{school.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedSchools.length > 0 && (
                    <p className="text-xs text-primary font-medium">
                      {selectedSchools.length} school{selectedSchools.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11"
              onClick={submitAd}
              disabled={saving || uploading}
            >
              {saving || uploading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{uploading ? "Uploading image…" : "Creating ad…"}</>
                : <><Megaphone className="h-4 w-4 mr-2" />Create Ad</>}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Ads */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Live ({activeAds.length})</TabsTrigger>
              <TabsTrigger value="inactive">Paused / Expired ({inactiveAds.length})</TabsTrigger>
              <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
            </TabsList>

            {[
              { value: "active",   list: activeAds },
              { value: "inactive", list: inactiveAds },
              { value: "all",      list: ads },
            ].map(({ value, list }) => (
              <TabsContent key={value} value={value}>
                {list.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No ads here</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((ad) => <AdCard key={ad.id} ad={ad} />)}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageAds;
