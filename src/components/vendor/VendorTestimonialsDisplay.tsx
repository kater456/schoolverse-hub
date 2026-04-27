import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

type TestimonialSource = "whatsapp" | "instagram" | "telegram" | "inperson" | "sms";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_faculty: string | null;
  item_purchased: string;
  quote: string | null;
  screenshot_url: string | null;
  source: TestimonialSource;
  type: "text" | "image";
  is_highlighted: boolean;
  created_at: string;
}

const SOURCE_CONFIG: Record<TestimonialSource, { label: string; emoji: string }> = {
  whatsapp:  { label: "WhatsApp",     emoji: "💬" },
  instagram: { label: "Instagram DM", emoji: "📸" },
  telegram:  { label: "Telegram",     emoji: "✈️"  },
  inperson:  { label: "In-person",    emoji: "🤝" },
  sms:       { label: "Text / SMS",   emoji: "📱" },
};

interface Props { vendorId: string; }

export default function VendorTestimonialsDisplay({ vendorId }: Props) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAll, setShowAll]           = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("vendor_testimonials")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("status", "published")
        .order("is_highlighted", { ascending: false })
        .order("created_at", { ascending: false });

      setTestimonials(data || []);
      setLoading(false);
    };
    fetch();
  }, [vendorId]);

  if (loading || testimonials.length === 0) return null;

  const highlighted = testimonials.filter((t) => t.is_highlighted);
  const rest        = testimonials.filter((t) => !t.is_highlighted);
  const displayed   = showAll ? rest : rest.slice(0, 2);

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">What Customers Say</h3>
          <span className="text-xs text-muted-foreground">({testimonials.length})</span>
        </div>
        <Badge variant="outline" className="text-xs h-5 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-700">
          ✦ Shared by seller
        </Badge>
      </div>

      {highlighted.length > 0 && (
        <div className="space-y-2">
          {highlighted.map((t) => <TestimonialCard key={t.id} t={t} highlighted />)}
        </div>
      )}

      {highlighted.length > 0 && rest.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">More reviews</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      <div className="space-y-2">
        {displayed.map((t) => <TestimonialCard key={t.id} t={t} />)}
      </div>

      {!showAll && rest.length > 2 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          See all {rest.length} reviews ↓
        </button>
      )}

      <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">🔍 About these reviews: </span>
        These were shared by the seller and reviewed by our team before publishing.
        Look for <strong>platform verified reviews</strong> (from in-app transactions) for the strongest trust signal.
      </div>
    </div>
  );
}

function TestimonialCard({ t, highlighted = false }: { t: Testimonial; highlighted?: boolean }) {
  const src = SOURCE_CONFIG[t.source] || SOURCE_CONFIG.whatsapp;
  const initials = t.customer_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card className={`border-l-2 ${highlighted ? "border-l-accent" : "border-l-border/60"}`}>
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold">{t.customer_name}</span>
              {highlighted && (
                <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-800 px-1.5 py-0 rounded font-medium">
                  ⭐ Top Review
                </span>
              )}
            </div>
            {t.customer_faculty && <p className="text-xs text-muted-foreground">{t.customer_faculty}</p>}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
            {src.emoji} {src.label}
          </span>
        </div>

        {t.type === "text" && t.quote && (
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            <span className="text-muted-foreground/40 text-lg leading-none mr-0.5">"</span>
            {t.quote}
            <span className="text-muted-foreground/40 text-lg leading-none ml-0.5">"</span>
          </p>
        )}

        {t.type === "image" && t.screenshot_url && (
          <a href={t.screenshot_url} target="_blank" rel="noopener noreferrer">
            <img
              src={t.screenshot_url}
              alt="Customer review screenshot"
              className="rounded-md max-h-48 object-contain w-full border border-border/50 hover:opacity-90 transition-opacity cursor-zoom-in"
            />
          </a>
        )}

        <p className="text-xs text-muted-foreground">
          Bought: <span className="font-medium text-foreground">{t.item_purchased}</span>
        </p>
      </CardContent>
    </Card>
  );
}
