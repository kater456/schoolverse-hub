import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Send, ShieldAlert, ShieldCheck,
  AlertTriangle, Loader2, MessageCircle, CheckCheck,
} from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  is_read: boolean | null;
  is_deleted: boolean | null;
  is_flagged: boolean | null;
  message_type: string | null;
  file_url: string | null;
}

interface Conversation {
  id: string;
  buyer_id: string | null;
  vendor_id: string | null;
  vendor_unread: number | null;
  buyer_unread: number | null;
  vendors?: {
    id: string;
    business_name: string;
    is_verified: boolean;
    user_id: string;
    vendor_images?: { image_url: string; is_primary: boolean }[];
  };
}

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages]         = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const [inputText, setInputText]       = useState("");
  const [otherName, setOtherName]       = useState("...");
  const [otherAvatar, setOtherAvatar]   = useState<string | null>(null);
  const [otherVerified, setOtherVerified] = useState(false);
  const [senderRoles, setSenderRoles]   = useState<Record<string, string>>({});
  const [iAmVendor, setIAmVendor]       = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // ── Load conversation + messages ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!conversationId || !user) return;

    const { data: conv, error: convErr } = await (supabase as any)
      .from("conversations")
      .select(`
        *,
        vendors(id, business_name, is_verified, user_id,
          vendor_images(image_url, is_primary))
      `)
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      toast({ title: "Conversation not found", variant: "destructive" });
      navigate("/messages");
      return;
    }

    setConversation(conv);

    const amVendor = conv.vendors?.user_id === user.id;
    setIAmVendor(amVendor);

    // Resolve other party's display name
    if (amVendor) {
      // I'm the vendor — show buyer's name
      if (conv.buyer_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", conv.buyer_id)
          .maybeSingle();
        if (prof) {
          setOtherName(`${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "Buyer");
        } else {
          setOtherName("Buyer");
        }
      }
    } else {
      // I'm the buyer — show vendor's name
      setOtherName(conv.vendors?.business_name || "Vendor");
      setOtherVerified(conv.vendors?.is_verified || false);
      const img = conv.vendors?.vendor_images?.find((i: any) => i.is_primary)?.image_url
        || conv.vendors?.vendor_images?.[0]?.image_url || null;
      setOtherAvatar(img);
    }

    // Load messages
    const { data: msgs } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages((msgs as Message[]) || []);

    // Fetch sender roles for admin badges
    const uniqueSenders = [...new Set(((msgs as Message[]) || []).map((m) => m.sender_id))];
    if (uniqueSenders.length > 0) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", uniqueSenders as string[]);
      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      setSenderRoles(roleMap);
    }

    setLoading(false);

    // Mark messages as read
    await (supabase as any)
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    // Reset unread counter
    const unreadField = amVendor ? "vendor_unread" : "buyer_unread";
    await (supabase as any)
      .from("conversations")
      .update({ [unreadField]: 0 })
      .eq("id", conversationId);
  }, [conversationId, user, navigate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // avoid duplicates
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If the new message is from the other person, mark it read immediately
          if (newMsg.sender_id !== user.id) {
            await (supabase as any)
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);

            const amV = conversation?.vendors?.user_id === user.id;
            const unreadField = amV ? "vendor_unread" : "buyer_unread";
            await (supabase as any)
              .from("conversations")
              .update({ [unreadField]: 0 })
              .eq("id", conversationId);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user, conversation]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !conversationId || !user || sending) return;

    setSending(true);
    setInputText("");

    const { error } = await (supabase as any).from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      message_type: "text",
      is_read: false,
    });

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      setInputText(text); // restore
    } else {
      // Update conversation last_message and increment other party's unread
      const otherUnreadField = iAmVendor ? "buyer_unread" : "vendor_unread";
      await (supabase as any).from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        [otherUnreadField]: (supabase as any).rpc ? undefined : undefined,
      }).eq("id", conversationId);

      // Simple increment
      const convData = await (supabase as any)
        .from("conversations")
        .select(otherUnreadField)
        .eq("id", conversationId)
        .single();
      const current = convData.data?.[otherUnreadField] || 0;
      await (supabase as any)
        .from("conversations")
        .update({ [otherUnreadField]: current + 1, last_message: text, last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " " +
      d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    if (msg.is_deleted) return;
    const dateStr = new Date(msg.created_at).toLocaleDateString("en-NG", {
      weekday: "long", day: "numeric", month: "long",
    });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, msgs: [msg] });
    }
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <button
          onClick={() => navigate("/messages")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 border border-border shrink-0">
            {otherAvatar ? <AvatarImage src={otherAvatar} /> : null}
            <AvatarFallback className="bg-accent/10 text-accent font-semibold text-sm">
              {otherName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-sm truncate">{otherName}</span>
              {otherVerified && !iAmVendor && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {iAmVendor ? "Customer" : "Vendor"}
            </p>
          </div>
        </div>

        {conversation?.vendors && !iAmVendor && (
          <Button variant="ghost" size="sm" asChild className="text-xs shrink-0">
            <Link to={`/vendor/${conversation.vendor_id}`}>View Store</Link>
          </Button>
        )}
      </header>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-accent" />
            </div>
            <p className="font-medium text-foreground">Start the conversation</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {iAmVendor
                ? "A customer has opened this chat. Say hello!"
                : `Send a message to ${otherName} about their products or services.`}
            </p>
          </div>
        )}

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium px-2">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {msgs.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const senderRole = senderRoles[msg.sender_id];
              const isAdminSender = senderRole === "super_admin" || senderRole === "admin" || senderRole === "sub_admin";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col mb-1.5 ${isMine ? "items-end" : "items-start"}`}
                >
                  {/* Admin badge */}
                  {!isMine && isAdminSender && (
                    <div className="flex items-center gap-1 text-[10px] text-primary mb-0.5 px-1">
                      <ShieldAlert className="h-3 w-3" />
                      <span className="font-medium">
                        {senderRole === "super_admin" ? "Super Admin" : "Campus Admin"}
                      </span>
                    </div>
                  )}

                  {/* Flagged warning */}
                  {msg.is_flagged && (
                    <div className="flex items-center gap-1 text-[10px] text-destructive mb-0.5 px-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Message flagged for review</span>
                    </div>
                  )}

                  <div
                    className={`
                      max-w-[78%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isMine
                        ? "bg-accent text-accent-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm border border-border/50"
                      }
                      ${msg.is_flagged ? "opacity-60" : ""}
                    `}
                  >
                    {msg.content}
                  </div>

                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    {isMine && msg.is_read && (
                      <CheckCheck className="h-3 w-3 text-accent" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        {conversation?.is_flagged ? (
          <div className="flex items-center gap-2 text-destructive text-sm py-2 justify-center">
            <AlertTriangle className="h-4 w-4" />
            <span>This conversation has been flagged. Messaging is restricted.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              className="flex-1 rounded-full bg-muted border-border/50 focus-visible:ring-accent"
              autoFocus
            />
            <Button
              onClick={sendMessage}
              disabled={!inputText.trim() || sending}
              size="icon"
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 h-10 w-10"
            >
              {sending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
