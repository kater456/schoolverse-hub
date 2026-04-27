import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare, Upload, Star, Trash2, Pin, PinOff,
  Loader2, CheckCircle, Clock, XCircle, Image, Type,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type TestimonialSource = "whatsapp" | "instagram" | "telegram" | "inperson" | "sms";
type TestimonialType   = "text" | "image";
type TestimonialStatus = "pending" | "published" | "rejected";

interface Testimonial {
  id: string;
  vendor_id: string;
  customer_name: string;
  customer_faculty: string | null;
  item_purchased: string;
  quote: string | null;
  screenshot_url: string | null;
  source: TestimonialSource;
  type: TestimonialType;
  status: TestimonialStatus;
  is_highlighted: boolean;
  created_at: string;
}

interface Props {
  vendorId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SOURCE_OPTIONS: { id: TestimonialSource; label: string; emoji: string; color: string }[] = [
  { id: "whatsapp",  label: "WhatsApp",     emoji: "💬", color: "text-green-600" },
  { id: "instagram", label: "Instagram DM", emoji: "📸", color: "text-pink-600"  },
  { id: "telegram",  label: "Telegram",     emoji: "✈️",  color: "text-blue-500"  },
  { id: "inperson",  label: "In-person",    emoji: "🤝", color: "text-amber-600" },
  { id: "sms",       label: "Text / SMS",   emoji: "📱", color: "text-violet-600"},
];

const statusConfig: Record<TestimonialStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Published",      icon: <CheckCircle className="h-3 w-3" />, variant: "default"     },
  pending:   { label: "Pending review", icon: <Clock       className="h-3 w-3" />, variant: "secondary"   },
  rejected:  { label: "Not approved",   icon: <XCircle     className="h-3 w-3" />, variant: "destructive" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function VendorTestimonialManager({ vendorId }: Props) {
  const { toast } = useToast();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // Form state
  const [mode, setMode]                 = useState<TestimonialType>("text");
  const [source, setSource]             = useState<TestimonialSource>("whatsapp");
  const [customerName, setCustomerName] = useState("");
  const [faculty, setFaculty]           = useState("");
  const [item, setItem]                 = useState("");
  const [quote, setQuote]               = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch testimonials ─────────────────────────────────────────────────────
  const fetchTestimonials = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("vendor_testimonials")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (!error) setTestimonials(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTestimonials(); }, [vendorId]);

  // ── Image selection ────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Submit testimonial ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerName.trim()) { toast({ title: "Customer name is required", variant: "destructive" }); return; }
    if (!item.trim())         { toast({ title: "Item purchased is required", variant: "destructive" }); return; }
    if (mode === "text"  && !quote.trim())   { toast({ title: "Quote is required", variant: "destructive" }); return; }
    if (mode === "image" && !imageFile)      { toast({ title: "Please select a screenshot", variant: "destructive" }); return; }

    setSubmitting(true);
    let screenshotUrl: string | null = null;

    if (mode === "image" && imageFile) {
      setUploadingImg(true);
      const path = `testimonials/${vendorId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("vendor-media")
        .upload(path, imageFile, { upsert: true });

      if (uploadErr || !uploadData) {
        toast({ title: "Image upload failed", description: uploadErr?.message, variant: "destructive" });
        setSubmitting(false);
        setUploadingImg(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(uploadData.path);
      screenshotUrl = urlData.publicUrl;
      setUploadingImg(false);
    }

    const { error } = await (supabase as any)
      .from("vendor_testimonials")
      .insert({
        vendor_id:        vendorId,
        customer_name:    customerName.trim(),
        customer_faculty: faculty.trim() || null,
        item_purchased:   item.trim(),
        quote:            mode === "text" ? quote.trim() : null,
        screenshot_url:   screenshotUrl,
        source,
        type:             mode,
        status:           "pending",
        is_highlighted:   false,
      });

    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Submitted for review ✅", description: "It'll appear on your profile once approved." });
      setShowForm(false);
      setCustomerName(""); setFaculty(""); setItem(""); setQuote("");
      setImagePreview(null); setImageFile(null); setMode("text"); setSource("whatsapp");
      fetchTestimonials();
    }
    setSubmitting(false);
  };

  // ── Toggle highlight ───────────────────────────────────────────────────────
  const toggleHighlight = async (t: Testimonial) => {
    const { error } = await (supabase as any)
      .from("vendor_testimonials")
      .update({ is_highlighted: !t.is_highlighted })
      .eq("id", t.id);

    if (!error) {
      setTestimonials((prev) =>
        prev.map((x) => x.id === t.id ? { ...x, is_highlighted: !t.is_highlighted } : x)
      );
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteTestimonial = async (id: string) => {
    const { error } = await (supabase as any)
      .from("vendor_testimonials")
      .delete()
      .eq("id", id);

    if (!error) {
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Testimonial removed" });
    }
  };

  const published = testimonials.filter((t) => t.status === "published");
  const pending   = testimonials.filter((t) => t.status === "pending");
  const rejected  = testimonials.filter((t) => t.status === "rejected");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            Customer Testimonials
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share what your buyers said. Reviewed by platform before publishing.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            + Add testimonial
          </Button>
        )}
      </div>

      {!showForm && testimonials.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-5 text-center space-y-2">
            <Star className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No testimonials yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Ask buyers to drop a quick WhatsApp message after purchase, then upload it here. Honest reviews sell better than perfect ones.
            </p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-accent/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">New Testimonial</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "text",  icon: <Type className="h-3.5 w-3.5" />,  label: "Type a quote"     },
                { id: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Upload screenshot" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    mode === m.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Where did this review come from?</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                      source === s.id
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Customer name *</Label>
                <Input placeholder="e.g. Chidi N." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Faculty / Level</Label>
                <Input placeholder="e.g. Engineering · 200L" value={faculty} onChange={(e) => setFaculty(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Item purchased *</Label>
              <Input placeholder="e.g. Scientific Calculator" value={item} onChange={(e) => setItem(e.target.value)} className="h-8 text-xs" />
            </div>

            {mode === "text" && (
              <div>
                <Label className="text-xs mb-1 block">What did they say? *</Label>
                <Textarea
                  placeholder="Type their exact words — genuine and casual reviews convert better than polished ones."
                  value={quote} onChange={(e) => setQuote(e.target.value)}
                  rows={3} className="text-xs resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{quote.length} chars</p>
              </div>
            )}

            {mode === "image" && (
              <div>
                <Label className="text-xs mb-1.5 block">Upload screenshot *</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                    imagePreview ? "border-green-500/40 bg-green-50 dark:bg-green-950/20" : "border-border hover:border-accent/50 bg-muted/30"
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img src={imagePreview} alt="Preview" className="max-h-36 mx-auto rounded-md object-contain" />
                      <p className="text-xs text-green-600">✓ Screenshot ready · Tap to change</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-medium">Tap to upload WhatsApp / DM screenshot</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG · Max 5MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <p className="text-xs text-muted-foreground mt-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                  💡 Blur out phone numbers before uploading. Only the review text needs to be visible.
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              🛡️ This will appear as <strong>"Customer Voice — shared by seller"</strong> on your profile.
              This label is required and builds more trust than hiding the source.
            </div>

            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSubmit}
              disabled={submitting || uploadingImg}
            >
              {(submitting || uploadingImg) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for review
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!showForm && testimonials.length > 0 && (
        <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5">💡 Tips to collect great testimonials</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
            <li>Ask right after the handover — that's when buyers are most excited</li>
            <li>A simple "drop me a quick review on Schoolverse" message works perfectly</li>
            <li>Screenshot their WhatsApp reply and upload it directly</li>
            <li>Highlighted testimonials appear at the top of your profile</li>
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">⏳ Pending Review ({pending.length})</p>
          {pending.map((t) => (
            <TestimonialManageCard key={t.id} t={t} onDelete={deleteTestimonial} onToggleHighlight={toggleHighlight} />
          ))}
        </div>
      )}

      {published.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">✓ Published ({published.length})</p>
          {published.map((t) => (
            <TestimonialManageCard key={t.id} t={t} onDelete={deleteTestimonial} onToggleHighlight={toggleHighlight} />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">✗ Not Approved ({rejected.length})</p>
          {rejected.map((t) => (
            <TestimonialManageCard key={t.id} t={t} onDelete={deleteTestimonial} onToggleHighlight={toggleHighlight} />
          ))}
        </div>
      )}

      {testimonials.length > 0 && (
        <div className="border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">📋 Platform policy</p>
          Fake, exaggerated, or self-written reviews result in a strike. Three strikes = account suspension.
          <strong className="text-foreground"> Authentic voices always win.</strong>
        </div>
      )}
    </div>
  );
}

function TestimonialManageCard({
  t, onDelete, onToggleHighlight,
}: {
  t: Testimonial;
  onDelete: (id: string) => void;
  onToggleHighlight: (t: Testimonial) => void;
}) {
  const sc = statusConfig[t.status];
  const src = SOURCE_OPTIONS.find((s) => s.id === t.source);

  return (
    <Card className="border-border/60">
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span className="text-sm font-semibold">{t.customer_name}</span>
            {t.customer_faculty && <span className="text-xs text-muted-foreground ml-1.5">· {t.customer_faculty}</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={sc.variant} className="text-xs gap-1 h-5">{sc.icon}{sc.label}</Badge>
            {src && <span className="text-xs text-muted-foreground">{src.emoji} {src.label}</span>}
          </div>
        </div>

        {t.type === "text" && t.quote && (
          <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">"{t.quote}"</p>
        )}
        {t.type === "image" && t.screenshot_url && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Image className="h-3.5 w-3.5" /> Screenshot uploaded
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Bought: <span className="font-medium text-foreground">{t.item_purchased}</span>
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline" size="sm"
            className={`h-7 text-xs gap-1 ${t.is_highlighted ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30" : ""}`}
            onClick={() => onToggleHighlight(t)}
            disabled={t.status !== "published"}
          >
            {t.is_highlighted ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {t.is_highlighted ? "Unpin" : "Highlight"}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(t.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
