import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, ImageIcon, Check } from "lucide-react";

interface SchoolBrandingPanelProps {
  schoolId: string;
  compact?: boolean;
  onSaved?: () => void;
}

interface SchoolRow {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  subdomain: string | null;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_BYTES = 4 * 1024 * 1024;

export const SchoolBrandingPanel = ({ schoolId, compact = false, onSaved }: SchoolBrandingPanelProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [form, setForm] = useState<Partial<SchoolRow>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
      if (!active) return;
      if (data) {
        setSchool(data as SchoolRow);
        setForm(data as SchoolRow);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [schoolId]);

  const handleField = (key: keyof SchoolRow, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleLogoFile = async (file: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Logo must be under 4MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const ext = file.name.split(".").pop() || "png";
      // Path must start with auth.uid() for storage RLS
      const path = `${user.id}/schools/${schoolId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vendor-media").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("vendor-media").getPublicUrl(path);
      const logo_url = pub.publicUrl;
      const { error: updErr } = await supabase.from("schools").update({ logo_url }).eq("id", schoolId);
      if (updErr) throw updErr;
      setForm((f) => ({ ...f, logo_url }));
      setSchool((s) => (s ? { ...s, logo_url } : s));
      toast({ title: "Logo updated" });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    const updates: Partial<SchoolRow> = {
      name: form.name?.trim() || school.name,
      subdomain: form.subdomain?.trim() || null,
      address: form.address?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      primary_color: form.primary_color || school.primary_color,
      secondary_color: form.secondary_color || school.secondary_color,
    };
    const { error } = await supabase.from("schools").update(updates).eq("id", schoolId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Branding saved" });
      setSchool((s) => (s ? { ...s, ...updates } as SchoolRow : s));
      onSaved?.();
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent>
      </Card>
    );
  }

  if (!school) {
    return <Card className="border-border/50"><CardContent className="py-6 text-sm text-muted-foreground">No campus assigned.</CardContent></Card>;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Campus Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
            {form.logo_url ? (
              <img src={form.logo_url} alt={`${school.name} logo`} className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{school.name}</p>
            <p className="text-xs text-muted-foreground mb-2">PNG, JPG, WEBP or SVG • up to 4MB</p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoFile(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
              {form.logo_url ? "Replace logo" : "Upload logo"}
            </Button>
          </div>
        </div>

        {!compact && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">School name</Label>
                <Input value={form.name || ""} onChange={(e) => handleField("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subdomain</Label>
                <Input value={form.subdomain || ""} onChange={(e) => handleField("subdomain", e.target.value)} placeholder="unec" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact email</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => handleField("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact phone</Label>
                <Input value={form.phone || ""} onChange={(e) => handleField("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={form.address || ""} onChange={(e) => handleField("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color || "#1e3a5f"}
                    onChange={(e) => handleField("primary_color", e.target.value)}
                    className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input value={form.primary_color || ""} onChange={(e) => handleField("primary_color", e.target.value)} placeholder="#1e3a5f" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondary_color || "#f59e0b"}
                    onChange={(e) => handleField("secondary_color", e.target.value)}
                    className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input value={form.secondary_color || ""} onChange={(e) => handleField("secondary_color", e.target.value)} placeholder="#f59e0b" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolBrandingPanel;
