import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage } from "@/lib/compressImage";
import {
  Send, ArrowLeft, Paperclip, Image, AlertTriangle, ShieldCheck,
  CheckCheck, Check, Loader2, Receipt, X, MoreVertical,
} from "lucide-react";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  is_read: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  created_at: string;
}

const ChatPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [conversation,  setConversation]  = useState<any>(null);
  const [otherParty,    setOtherParty]    = useState<any>(null);
  const [vendor,        setVendor]        = useState<any>(null);
  const [inputText,     setInputText]     = useState("");
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [isVendor,      setIsVendor]      = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversation + messages
  const load = useCallback(async () => {
    if (!conversationId || !user) return;

    const { data: conv } = await (supabase as any)
      .from("conversations")
      .select("*, vendors(id, business_name, user_id, vendor_images(image_url, is_primary))")
      .eq("id", conversationId)
      .single();

    if (!conv) { navigate("/messages"); return; }
    setConversation(conv);

    const v = conv.vendors as any;
    setVendor(v);
    const iAmVendor = v?.user_id === user.id;
    setIsVendor(iAmVendor);

    // Get other party profile
    const otherId = iAmVendor ? conv.buyer_id : null;
    if (otherId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", otherId)
        .maybeSingle();
      setOtherParty(profile);
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages((msgs as Message[]) || []);

    // Mark messages as read
    await supabase.from("messages")
      .update({ is_read: true } as any)
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    // Reset unread count
    if (iAmVendor) {
      await supabase.from("conversations").update({ vendor_unread: 0 } as any).eq("id", conversationId);
    } else {
      await supabase.from("conversations").update({ buyer_unread: 0 } as any).eq("id", conversationId);
    }

    setLoading(false);
    setTimeout(scrollToBottom, 100);
  }, [conversationId, user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);

        // Mark as read if not our message
        if (newMsg.sender_id !== user?.id) {
          supabase.from("messages").update({ is_read: true } as any).eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const sendMessage = async (content: string, type = "text", fileUrl?: string) => {
    if (!user || !conversationId) return;
    if (type === "text" && !content.trim()) return;

    setSending(true);
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || null,
        message_type: type,
        file_url: fileUrl || null,
        is_read: false,
        ai_flagged: false,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to send", variant: "destructive" });
      setSending(false);
      return;
    }

    // Update conversation last message
    const lastMsg = type === "text" ? content.trim() : type === "receipt" ? "📎 Payment receipt" : "📷 Image";
    await supabase.from("conversations").update({
      last_message: lastMsg,
      last_message_at: new Date().toISOString(),
      ...(isVendor ? { buyer_unread: (conversation?.buyer_unread || 0) + 1 } : { vendor_unread: (conversation?.vendor_unread || 0) + 1 }),
    } as any).eq("id", conversationId);

    // Run AI monitoring in background (don't await)
    if (type === "text" && msg) {
      supabase.functions.invoke("monitor-message", {
        body: { conversation_id: conversationId, message_id: msg.id, content: content.trim() },
      }).catch(() => {});
    }

    setInputText("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "receipt") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const compressed = file.type.startsWith("image/") ? await compressImage(file, 1200) : file;
    const path = `chat/${conversationId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("vendor-media").upload(path, compressed, { upsert: true });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(data.path);
    await sendMessage(type === "receipt" ? "Payment receipt" : "Image", type, urlData.publicUrl);
    setUploading(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) { last.msgs.push(msg); }
    else { groupedMessages.push({ date, msgs: [msg] }); }
  });

  const vendorAvatar = vendor?.vendor_images?.find((img: any) => img.is_primary)?.image_url
    || vendor?.vendor_images?.[0]?.image_url;

  const otherName = isVendor
    ? `${otherParty?.first_name || ""} ${otherParty?.last_name || ""}`.trim() || "Buyer"
    : vendor?.business_name || "Vendor";

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <button onClick={() => navigate("/messages")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Avatar className="h-9 w-9 border border-border">
          {vendorAvatar && !isVendor ? <AvatarImage src={vendorAvatar} /> : null}
          <AvatarFallback className="bg-accent/10 text-accent text-sm">
            {otherName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">{otherName}</span>
            {vendor?.is_verified && !isVendor && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isVendor ? "Buyer" : vendor?.category}
          </p>
        </div>

        {conversation?.is_flagged && (
          <Badge className="bg-destructive/20 text-destructive text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> Flagged
          </Badge>
        )}

        {!isVendor && (
          <Link to={`/vendor/${vendor?.id}`}>
            <Button variant="ghost" size="sm" className="text-xs h-8">View Profile</Button>
          </Link>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Disclaimer */}
        <div className="flex justify-center">
          <div className="bg-muted/60 rounded-xl px-4 py-2.5 text-center max-w-sm">
            <p className="text-[11px] text-muted-foreground">
              🔒 Messages are monitored for safety. Keep all agreements here — never share personal details or move payments outside Campus Market.
            </p>
          </div>
        </div>

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date} className="space-y-2">
            {/* Date divider */}
            <div className="flex justify-center">
              <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{date}</span>
            </div>

            {msgs.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {/* AI flag warning */}
                    {msg.ai_flagged && (
                      <div className="flex items-center gap-1 text-[10px] text-destructive mb-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Flagged: {msg.ai_flag_reason}</span>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? "bg-accent text-accent-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    } ${msg.ai_flagged ? "border border-destructive/40" : ""}`}>

                      {/* Image */}
                      {msg.message_type === "image" && msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                          <img src={msg.file_url} alt="Image" className="rounded-lg max-w-full max-h-48 object-cover mb-1" />
                        </a>
                      )}

                      {/* Receipt */}
                      {msg.message_type === "receipt" && msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 py-1">
                          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">Payment Receipt</p>
                            <p className="text-[10px] opacity-70">Tap to view</p>
                          </div>
                        </a>
                      )}

                      {/* Text */}
                      {msg.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>

                    {/* Time + read indicator */}
                    <div className={`flex items-center gap-1 ${isMine ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      {isMine && (
                        msg.is_read
                          ? <CheckCheck className="h-3 w-3 text-accent" />
                          : <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-accent" />
            </div>
            <p className="font-medium text-foreground">Start the conversation</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {isVendor
                ? "A buyer wants to chat. Say hello!"
                : `Ask ${vendor?.business_name} about their products or services.`}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-border bg-background px-3 py-3 pb-safe">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          {/* Attachment menu */}
          <div className="flex gap-1 shrink-0">
            <label className="w-9 h-9 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors" title="Send image">
              <Image className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFileUpload(e, "image")} disabled={uploading} />
            </label>
            <label className="w-9 h-9 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors" title="Send receipt">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*,.pdf" className="hidden"
                onChange={(e) => handleFileUpload(e, "receipt")} disabled={uploading} />
            </label>
          </div>

          {/* Text input */}
          <div className="flex-1 flex items-end bg-muted rounded-2xl px-3 py-2 gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputText);
                }
              }}
              placeholder="Type a message…"
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
              disabled={sending || uploading}
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          </div>

          {/* Send */}
          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || sending || uploading}
            className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-all shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
