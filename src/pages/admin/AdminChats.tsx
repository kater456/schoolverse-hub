import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle, AlertTriangle, Search, Eye, ShieldCheck,
  Loader2, CheckCheck, Check, Receipt, Image, X,
} from "lucide-react";

const AdminChats = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected,      setSelected]      = useState<any>(null);
  const [messages,      setMessages]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [search,        setSearch]        = useState("");

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    const { data } = await (supabase as any)
      .from("conversations")
      .select("*, vendors(id, business_name, is_verified)")
      .order("last_message_at", { ascending: false });

    // Enrich with buyer profiles
    const convs = data || [];
    const buyerIds = convs.map((c: any) => c.buyer_id).filter(Boolean);
    let profiles: any[] = [];
    if (buyerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, first_name, last_name").in("id", buyerIds);
      profiles = profs || [];
    }

    setConversations(convs.map((c: any) => ({
      ...c,
      buyer_profile: profiles.find((p) => p.id === c.buyer_id),
    })));
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setSelected(conv);
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMsgs(false);
  };

  const resolveFlag = async (convId: string) => {
    await supabase.from("conversations")
      .update({ is_flagged: false, flagged_reason: null } as any)
      .eq("id", convId);
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, is_flagged: false } : c));
    if (selected?.id === convId) setSelected((s: any) => ({ ...s, is_flagged: false }));
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const flagged  = conversations.filter((c) => c.is_flagged);
  const allConvs = conversations;

  const filtered = (list: any[]) => list.filter((c) =>
    (c.vendors?.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (`${c.buyer_profile?.first_name || ""} ${c.buyer_profile?.last_name || ""}`).toLowerCase().includes(search.toLowerCase())
  );

  const ConvList = ({ list }: { list: any[] }) => (
    <div className="space-y-1">
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
      )}
      {filtered(list).map((conv) => (
        <button
          key={conv.id}
          onClick={() => openConversation(conv)}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
            selected?.id === conv.id ? "bg-accent/10 border border-accent/20" : "hover:bg-muted/50"
          }`}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {(conv.vendors?.business_name || "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{conv.vendors?.business_name || "Vendor"}</span>
              {conv.vendors?.is_verified && <ShieldCheck className="h-3 w-3 text-primary shrink-0" />}
              {conv.is_flagged && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Buyer: {conv.buyer_profile ? `${conv.buyer_profile.first_name || ""} ${conv.buyer_profile.last_name || ""}`.trim() : "Unknown"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatTime(conv.last_message_at)}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-accent" /> Chat Oversight
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor conversations and review flagged messages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Chats",    value: conversations.length,                    color: "text-foreground" },
            { label: "Flagged",        value: flagged.length,                          color: "text-destructive" },
            { label: "AI Monitored",   value: conversations.length,                    color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: conversation list */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Tabs defaultValue="flagged">
                  <TabsList className="mx-3 mb-2">
                    <TabsTrigger value="flagged">
                      Flagged {flagged.length > 0 && (
                        <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 rounded-full">{flagged.length}</span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="all">All ({allConvs.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="flagged" className="px-2 pb-2">
                    <ConvList list={flagged} />
                  </TabsContent>
                  <TabsContent value="all" className="px-2 pb-2">
                    <ConvList list={allConvs} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Right: message viewer */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              {selected ? (
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {selected.vendors?.business_name}
                      {selected.is_flagged && (
                        <Badge className="bg-destructive/20 text-destructive text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buyer: {selected.buyer_profile
                        ? `${selected.buyer_profile.first_name || ""} ${selected.buyer_profile.last_name || ""}`.trim()
                        : "Unknown"}
                      {selected.flagged_reason && ` · Reason: ${selected.flagged_reason}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.is_flagged && (
                      <Button size="sm" variant="outline" className="text-xs h-7 text-success border-success/40"
                        onClick={() => resolveFlag(selected.id)}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Resolve
                      </Button>
                    )}
                    <button onClick={() => { setSelected(null); setMessages([]); }}
                      className="p-1 hover:bg-muted rounded-lg transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <CardTitle className="text-sm text-muted-foreground">Select a conversation to view</CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : selected ? (
                <div className="max-h-[440px] overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                  )}
                  {messages.map((msg) => {
                    const isBuyer = msg.sender_id === selected.buyer_id;
                    return (
                      <div key={msg.id} className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[75%] space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>{isBuyer ? "Buyer" : "Vendor"}</span>
                            {msg.ai_flagged && (
                              <Badge className="bg-destructive/20 text-destructive text-[9px] gap-0.5 h-4 px-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> AI Flag
                              </Badge>
                            )}
                          </div>
                          <div className={`rounded-xl px-3 py-2 text-sm ${
                            isBuyer ? "bg-muted text-foreground" : "bg-accent/20 text-foreground"
                          } ${msg.ai_flagged ? "border border-destructive/40" : ""}`}>
                            {msg.message_type === "receipt" && (
                              <div className="flex items-center gap-2 mb-1">
                                <Receipt className="h-4 w-4 text-success" />
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline">View Receipt</a>
                              </div>
                            )}
                            {msg.message_type === "image" && msg.file_url && (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                <img src={msg.file_url} alt="img" className="max-h-32 rounded-lg object-cover mb-1" />
                              </a>
                            )}
                            {msg.content && <p>{msg.content}</p>}
                            {msg.ai_flag_reason && (
                              <p className="text-[10px] text-destructive mt-1">⚠ {msg.ai_flag_reason}</p>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Eye className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Select a conversation to monitor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChats;
