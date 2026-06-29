import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeSafe } from "@/lib/safeStorage";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Loader2 } from "lucide-react";

interface Props {
  /** If sub_admin, lock to their assigned campus */
  scope?: "super_admin" | "sub_admin";
}

const PushBroadcastPanel = ({ scope = "super_admin" }: Props) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [audience, setAudience] = useState<"all" | "vendors">("all");
  const [schoolId, setSchoolId] = useState<string>(scope === "sub_admin" ? (userRole?.assigned_school_id || "") : "");
  const [schools, setSchools] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (scope === "super_admin") {
      (supabase.from("schools") as any).select("id,name").order("name").then(({ data }: any) => setSchools(data || []));
    }
    loadHistory();
    const ch = isRealtimeSafe()
      ? supabase
          .channel("push_log")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_activity_log" }, loadHistory)
          .subscribe()
      : null;
    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  const loadHistory = async () => {
    const { data } = await (supabase.from("admin_activity_log") as any)
      .select("*").eq("action", "push_broadcast")
      .order("created_at", { ascending: false }).limit(20);
    setHistory(data || []);
  };

  const send = async () => {
    if (!title || !body) { toast({ title: "Title and message required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title, body, url: url || "/",
          school_id: schoolId || null,
          audience,
          tag: `broadcast:${Date.now()}`,
          sender_id: user?.id,
          sender_role: userRole?.role,
        },
      });
      if (error) throw error;
      toast({ title: "Notification sent 🔔", description: `Delivered to ${data?.sent ?? 0} device(s).` });
      setTitle(""); setBody("");
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { mode: "test", sender_id: user?.id, sender_role: userRole?.role },
      });
      if (error) throw error;
      toast({
        title: data?.sent ? "Test sent 🔔" : "No device subscribed yet",
        description: data?.sent
          ? `Delivered to ${data.sent} of your device(s).`
          : "Enable notifications on this device first, then try again.",
        variant: data?.sent ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Send Push Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="🎉 Big news on Campus Market" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="What do you want to tell users?" rows={3} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="vendors">Vendors only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "super_admin" ? (
              <div>
                <Label>Campus</Label>
                <Select value={schoolId || "all"} onValueChange={(v) => setSchoolId(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campuses</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Campus</Label>
                <Input disabled value="Your campus only" />
              </div>
            )}
            <div>
              <Label>Open URL (optional)</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="/" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={send} disabled={sending} className="w-full sm:w-auto">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Notification
            </Button>
            <Button onClick={sendTest} disabled={sending} variant="outline" className="w-full sm:w-auto">
              <Bell className="h-4 w-4 mr-2" /> Send test to myself
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent broadcasts</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-sm border rounded-lg p-2.5 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{h.details?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.details?.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {h.details?.sender_role || "admin"} · {h.details?.audience || "all"}
                      {h.details?.school_id ? " · campus" : " · all campuses"}
                      {" · "}{h.details?.recipients ?? 0} delivered
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PushBroadcastPanel;
