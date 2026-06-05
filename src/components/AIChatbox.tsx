import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const SUGGESTED_QUESTIONS = [
  "Who sells food on campus?",
  "Where can I get a haircut?",
  "Any tech gadget vendors?",
  "Who does laundry services?",
];

const AIChatbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [schoolId, setSchoolId]       = useState<string | null>(null);
  const [hasGreeted, setHasGreeted]   = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Get user's school for more relevant vendor results
  useEffect(() => {
    if (!user) return;
    const fetchSchool = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.school_id) setSchoolId(data.school_id);
    };
    fetchSchool();
  }, [user]);

  // Greet when opened for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      setMessages([{
        role: "assistant",
        content: `Hey! 👋 I'm your Campus Market assistant. Ask me about vendors, promos, products, or how to sell on your campus.`,
        suggestions: ["Browse vendors", "View today's promos", "How to sell on Campus Market?"],
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Detect [CONNECT:vendor_id] token; strip from displayed text
  const parseReply = (raw: string): { text: string; connectVendorId?: string } => {
    const m = raw.match(/\[CONNECT:([a-f0-9-]+)\]/i);
    if (m) return { text: raw.replace(m[0], "").trim(), connectVendorId: m[1] };
    return { text: raw };
  };

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;

    // Quick navigation shortcuts
    if (/^browse vendors$/i.test(content)) { setIsOpen(false); navigate("/browse"); return; }
    if (/^view (today's )?promos$/i.test(content)) { setIsOpen(false); navigate("/browse?filter=deals"); return; }
    if (/^how to sell/i.test(content)) {
      setMessages((p) => [...p, { role: "user", content }, {
        role: "assistant",
        content: "Easy! Tap **Sign Up** → choose **Vendor** → submit your business info and ID. Once approved, you can list products, post reels, and start selling. 🚀",
        suggestions: ["Sign me up", "What does it cost?", "Browse vendors"],
      }]);
      return;
    }
    if (/^sign me up$/i.test(content)) { setIsOpen(false); navigate("/signup"); return; }

    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: updatedMessages, school_id: schoolId },
      });

      if (error || !data?.reply) throw new Error(error?.message || "No response");

      const { text, connectVendorId } = parseReply(data.reply);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: text,
        suggestions: data.suggestions || [],
      }]);

      if (connectVendorId) {
        setTimeout(() => { setIsOpen(false); navigate(`/vendor/${connectVendorId}`); }, 800);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble right now. Please try again in a moment! 🙏",
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };


  return (
    <>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden"
          style={{ height: "min(520px, calc(100vh - 120px))" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-accent text-accent-foreground shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Campus AI</p>
                <p className="text-xs opacity-75 mt-0.5">Find vendors · Ask anything</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-accent-foreground/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                  msg.role === "user" ? "bg-primary/10" : "bg-accent/20"
                }`}>
                  {msg.role === "user"
                    ? <User className="h-3.5 w-3.5 text-primary" />
                    : <Bot  className="h-3.5 w-3.5 text-accent" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2 flex-row">
                <div className="shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Suggested questions — only at the start */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground pl-8">Try asking:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="ml-8 block text-left text-xs text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors border border-primary/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border/50 bg-background shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask me anything…"
                className="h-9 text-sm rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-accent"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full bg-accent hover:bg-accent/90"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Powered by AI · Results may vary
            </p>
          </div>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full shadow-lg transition-all duration-200 active:scale-95 ${
          isOpen
            ? "bg-muted text-muted-foreground px-4 py-3"
            : "bg-accent text-accent-foreground px-4 py-3 hover:bg-accent/90 hover:shadow-xl"
        }`}
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5" />
            <span className="text-sm font-medium">Close</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Ask AI</span>
            <MessageCircle className="h-4 w-4" />
          </>
        )}
      </button>
    </>
  );
};

export default AIChatbox;
