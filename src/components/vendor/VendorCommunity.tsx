import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Edit3, Check, X, RefreshCw, Loader2,
  Users, Megaphone, Bot, PenLine, Clock,
} from "lucide-react";

interface CommunityPost {
  id: string;
  content: string;
  generated_by: string;
  is_vendor_edited: boolean;
  vendor_edit: string | null;
  created_at: string;
}

interface Props {
  vendor: any;
}

export default function VendorCommunity({ vendor }: Props) {
  const { toast } = useToast();
  const [posts, setPosts]               = useState<CommunityPost[]>([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editText, setEditText]         = useState("");
  const [savingEdit, setSavingEdit]     = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("ai_community_posts")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [vendor.id]);

  // ── Generate a new AI community post ─────────────────────────────────────
  const generatePost = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("vendor-ai-advisor", {
        body: { vendor_id: vendor.id, mode: "community_post" },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast({ title: "✦ New post generated!", description: "Market Mind just dropped an update for your community." });
      fetchPosts();
    } catch (err: any) {
      toast({ title: "Couldn't generate post", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  // ── Vendor edits a post ───────────────────────────────────────────────────
  const startEdit = (post: CommunityPost) => {
    setEditingId(post.id);
    setEditText(post.vendor_edit || post.content);
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setSavingEdit(true);
    const { error } = await (supabase as any)
      .from("ai_community_posts")
      .update({ vendor_edit: editText.trim(), is_vendor_edited: true })
      .eq("id", id);

    if (!error) {
      setPosts((prev) => prev.map((p) =>
        p.id === id ? { ...p, vendor_edit: editText.trim(), is_vendor_edited: true } : p
      ));
      toast({ title: "Post updated" });
    }
    setEditingId(null);
    setSavingEdit(false);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  const deletePost = async (id: string) => {
    await (supabase as any).from("ai_community_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-accent/5 p-5">
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-primary/6 translate-y-10 -translate-x-8 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md flex-shrink-0">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-foreground">Store Community</h3>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] h-5">
                AI-Powered
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Market Mind automatically writes posts about your store's journey and insights.
              You can edit or rewrite any post before your community sees it.
            </p>
          </div>
        </div>
      </div>

      {/* Generate CTA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">AI-Generated Posts</p>
          <p className="text-xs text-muted-foreground">Market Mind writes. You review and control.</p>
        </div>
        <Button
          onClick={generatePost}
          disabled={generating}
          className="bg-gradient-to-r from-accent to-primary text-white gap-2 shadow-sm"
          size="sm"
        >
          {generating
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
            : <><Sparkles className="h-3.5 w-3.5" />Generate Post</>
          }
        </Button>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: <Bot className="h-4 w-4 mx-auto text-accent" />,    label: "AI writes post", sub: "from your store data" },
          { icon: <PenLine className="h-4 w-4 mx-auto text-primary" />, label: "You review it",  sub: "edit any time"       },
          { icon: <Megaphone className="h-4 w-4 mx-auto text-emerald-500" />, label: "Community sees it", sub: "builds trust" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/30 border border-border/50 p-2.5">
            {s.icon}
            <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Posts list */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-6 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No posts yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Hit "Generate Post" and Market Mind will write your first community update based on your real store data.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {posts.map((post) => {
          const displayContent = post.vendor_edit || post.content;
          const isEditing = editingId === post.id;

          return (
            <Card key={post.id} className={`border-border/60 transition-all ${isEditing ? "border-accent/40 shadow-sm" : ""}`}>
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.is_vendor_edited ? (
                    <Badge variant="outline" className="text-[10px] h-5 border-blue-400/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20 gap-1">
                      <PenLine className="h-2.5 w-2.5" /> Edited by you
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 border-accent/40 text-accent bg-accent/5 gap-1">
                      <Bot className="h-2.5 w-2.5" /> Market Mind
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />{timeAgo(post.created_at)}
                  </span>
                </div>
                {!isEditing && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(post)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deletePost(post.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-sm resize-none min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => saveEdit(post.id)} disabled={savingEdit}>
                        {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-auto gap-1 text-muted-foreground"
                        onClick={() => setEditText(post.content)}>
                        <RefreshCw className="h-3 w-3" /> Reset to AI
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{displayContent}</p>
                )}

                {/* Original vs edited indicator */}
                {!isEditing && post.is_vendor_edited && (
                  <button
                    onClick={() => startEdit(post)}
                    className="mt-2 text-[10px] text-muted-foreground hover:text-foreground underline block"
                  >
                    View original AI version
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">
        Market Mind generates posts from your live store data. You have full editorial control over every post.
      </p>
    </div>
  );
}
