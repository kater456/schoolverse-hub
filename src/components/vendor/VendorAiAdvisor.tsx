import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Send, Loader2, Bot, User, RefreshCw,
  TrendingUp, ShoppingBag, Star, Zap, MessageSquare,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  vendor: any;
}

// ── Quick prompt chips ────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: <TrendingUp className="h-3 w-3" />,   label: "Audit my store",          prompt: "Give me a full honest audit of my store right now. What's working and what needs to change?" },
  { icon: <ShoppingBag className="h-3 w-3" />,  label: "Boost my products",       prompt: "How should I improve my product listings to get more buyers?" },
  { icon: <Star className="h-3 w-3" />,          label: "Get more reviews",        prompt: "What's the best strategy to collect more genuine customer reviews for my store?" },
  { icon: <Zap className="h-3 w-3" />,           label: "Increase views",          prompt: "My profile views are low. Give me 3 specific things I can do today to get more eyes on my store." },
  { icon: <MessageSquare className="h-3 w-3" />, label: "Write my description",    prompt: "Write a compelling, conversion-focused store description for my campus business." },
];

export default function VendorAIAdvisor({ vendor }: Props) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [initiated, setInitiated]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Load last 10 messages from history ───────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await (supabase as any)
        .from("ai_conversations")
        .select("user_message, ai_reply, created_at")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        // Reconstruct into message pairs (oldest first)
        const history: Message[] = [];
        data.reverse().forEach((row: any) => {
          history.push({ role: "user",      content: row.user_message });
          history.push({ role: "assistant", content: row.ai_reply     });
        });
        setMessages(history);
        setInitiated(true);
      }
    };
    loadHistory();
  }, [vendor.id]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setInitiated(true);

    try {
      const { data, error } = await supabase.functions.invoke("vendor-ai-advisor", {
        body: {
          vendor_id: vendor.id,
          messages: newMessages,
          mode: "advisor",
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I ran into an issue — try again in a moment. " + err.message },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => { setMessages([]); setInitiated(false); };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="relative rounded-2xl overflow-hidden border border-accent/20 bg-gradient-to-br from-accent/10 via-background to-primary/5 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/8 -translate-y-12 translate-x-12 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-foreground">Market Mind</h3>
              <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] h-5">
                AI Store Advisor
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 border-emerald-400/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
                ✦ Premium Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              I know your store inside out — your products, stats, reviews, and gaps.
              Ask me anything about growing your campus business.
            </p>
          </div>
        </div>
      </div>

      {/* Quick prompts — show before first message */}
      {!initiated && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Quick starts
          </p>
          <div className="grid grid-cols-1 gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-accent/40 transition-all text-sm text-foreground"
              >
                <span className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                  {qp.icon}
                </span>
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {initiated && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Conversation</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={clearChat}>
              <RefreshCw className="h-3 w-3" /> New chat
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-accent to-primary"
                      : "bg-foreground/80"
                  }`}>
                    {msg.role === "assistant"
                      ? <Bot className="h-3.5 w-3.5" />
                      : <User className="h-3.5 w-3.5" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm border border-border/40"
                  }`}>
                    {msg.content.split("\n").map((line, li) => (
                      <span key={li}>
                        {line}
                        {li < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-primary flex-shrink-0 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Ask Market Mind anything about your store…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none text-sm flex-1"
          disabled={loading}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="h-[58px] w-11 p-0 bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Market Mind is powered by Campus Market AI and knows your store data.
        Conversations are saved to help it improve your advice over time.
      </p>
    </div>
  );
}
