import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, MessageCircle, ShieldCheck, AlertTriangle } from "lucide-react";

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [vendorId,      setVendorId]      = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    supabase.from("vendors").select("id").eq("user_id", user.id).eq("is_approved", true)
      .maybeSingle().then(({ data }) => { if (data) setVendorId(data.id); });

    const channel = supabase.channel("inbox-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await (supabase as any)
      .from("conversations")
      .select(`
        *,
        vendors(id, business_name, is_verified, user_id, vendor_images(image_url, is_primary)),
        buyer:buyer_id(id)
      `)
      .order("last_message_at", { ascending: false });

    // FIX: Show conversations that have messages OR that have unread counts
    // (previously, new conversations with unread badges were hidden because last_message was null)
    const convs = (data || []).filter((c: any) => {
      return (
        c.last_message !== null ||
        c.last_message_at !== null ||
        (c.vendor_unread || 0) > 0 ||
        (c.buyer_unread || 0) > 0
      );
    });

    const buyerIds = convs.map((c: any) => c.buyer_id).filter(Boolean);
    let profiles: any[] = [];
    if (buyerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", buyerIds);
      profiles = profs || [];
    }

    const enriched = convs.map((c: any) => ({
      ...c,
      buyer_profile: profiles.find((p) => p.user_id === c.buyer_id),
    }));

    setConversations(enriched);
    setLoading(false);
  };

  const getDisplayName = (conv: any) => {
    const iAmVendor = conv.vendors?.user_id === user?.id;
    if (iAmVendor) {
      const bp = conv.buyer_profile;
      return bp ? `${bp.first_name || ""} ${bp.last_name || ""}`.trim() || "Buyer" : "Buyer";
    }
    return conv.vendors?.business_name || "Vendor";
  };

  const getAvatar = (conv: any) => {
    const iAmVendor = conv.vendors?.user_id === user?.id;
    if (iAmVendor) return null;
    return conv.vendors?.vendor_images?.find((img: any) => img.is_primary)?.image_url
      || conv.vendors?.vendor_images?.[0]?.image_url || null;
  };

  const getUnread = (conv: any) => {
    const iAmVendor = conv.vendors?.user_id === user?.id;
    return iAmVendor ? (conv.vendor_unread || 0) : (conv.buyer_unread || 0);
  };

  const filtered = conversations.filter((c) =>
    getDisplayName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.last_message || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <Badge variant="secondary" className="text-xs">
            {conversations.filter((c) => getUnread(c) > 0).length} unread
          </Badge>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start chatting by clicking "Message Vendor" on any vendor profile.
            </p>
            <Link to="/browse" className="text-sm text-accent hover:underline mt-3">
              Browse Vendors →
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((conv) => {
              const unread    = getUnread(conv);
              const avatarSrc = getAvatar(conv);
              const name      = getDisplayName(conv);
              const iAmVendor = conv.vendors?.user_id === user?.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 border border-border">
                      {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
                      <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                          {name}
                        </span>
                        {!iAmVendor && conv.vendors?.is_verified && (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        {conv.is_flagged && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.last_message || "Tap to start the conversation…"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;
