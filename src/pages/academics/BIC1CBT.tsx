import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Lock, Unlock, Users, Trophy, BarChart2,
  RefreshCw, Eye, BookOpen, Clock, Search, X
} from "lucide-react";

interface Session {
  id: string;
  course_id: string;
  course_name: string;
  is_open: boolean;
  locked_message: string;
  updated_at: string;
}

interface Visitor {
  id: string;
  course_id: string;
  user_email: string | null;
  user_name: string | null;
  visited_at: string;
  completed_test: boolean;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
}

const COURSE_ICONS: Record<string, string> = {
  bic1: "🧬", anatomy: "🦴", histology: "🔬", embryology: "🥚"
};

export default function AdminAcademics() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from("academic_sessions")
      .select("*")
      .order("course_id");
    if (!error && data) setSessions(data as Session[]);
    setLoadingSessions(false);
  }, []);

  const fetchVisitors = useCallback(async () => {
    setLoadingVisitors(true);
    const { data, error } = await supabase
      .from("academic_visitors")
      .select("*")
      .order("visited_at", { ascending: false })
      .limit(200);
    if (!error && data) setVisitors(data as Visitor[]);
    setLoadingVisitors(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchVisitors();
  }, [fetchSessions, fetchVisitors]);

  const toggleSession = async (session: Session) => {
    setTogglingId(session.id);
    const { error } = await supabase
      .from("academic_sessions")
      .update({ is_open: !session.is_open })
      .eq("id", session.id);
    if (error) {
      toast({ title: "Failed to update session", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${session.course_name} ${!session.is_open ? "unlocked ✅" : "locked 🔒"}` });
      fetchSessions();
    }
    setTogglingId(null);
  };

  const saveMessage = async (session: Session) => {
    const { error } = await supabase
      .from("academic_sessions")
      .update({ locked_message: msgDraft })
      .eq("id", session.id);
    if (error) {
      toast({ title: "Failed to save message", variant: "destructive" });
    } else {
      toast({ title: "Lock message updated ✅" });
      setEditingMsg(null);
      fetchSessions();
    }
  };

  // Stats
  const totalVisits = visitors.length;
  const totalCompletions = visitors.filter(v => v.completed_test).length;
  const avgScore = visitors.filter(v => v.percentage !== null).length > 0
    ? Math.round(visitors.filter(v => v.percentage !== null).reduce((s, v) => s + (v.percentage || 0), 0) / visitors.filter(v => v.percentage !== null).length)
    : 0;
  const todayVisits = visitors.filter(v => new Date(v.visited_at).toDateString() === new Date().toDateString()).length;

  // Filtered visitors
  const filteredVisitors = visitors.filter(v => {
    const matchSearch = !search ||
      (v.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.user_name || "").toLowerCase().includes(search.toLowerCase());
    const matchCourse = filterCourse === "all" || v.course_id === filterCourse;
    return matchSearch && matchCourse;
  });

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" /> Academics Control
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Lock/unlock CBT sessions and monitor all visitors</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
          onClick={() => { fetchSessions(); fetchVisitors(); }}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Visits", value: totalVisits, icon: Eye, color: "text-blue-400" },
          { label: "Today", value: todayVisits, icon: Clock, color: "text-green-400" },
          { label: "Completions", value: totalCompletions, icon: Trophy, color: "text-yellow-400" },
          { label: "Avg Score", value: avgScore > 0 ? `${avgScore}%` : "—", icon: BarChart2, color: "text-purple-400" },
        ].map(s => (
          <div key={s.label} className="bg-muted/40 border border-border/50 rounded-xl p-3">
            <s.icon className={`h-4 w-4 ${s.color} mb-1.5`} />
            <div className="text-lg font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Session Controls */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4" /> Session Access Control
        </h3>
        <div className="space-y-3">
          {loadingSessions ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading sessions...</div>
          ) : sessions.map(s => (
            <div key={s.id} className="border border-border/50 rounded-xl p-4 bg-card">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{COURSE_ICONS[s.course_id] || "📚"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{s.course_name}</span>
                    <Badge className={s.is_open
                      ? "bg-green-500/15 text-green-500 text-[10px] h-4 px-1.5"
                      : "bg-red-500/15 text-red-400 text-[10px] h-4 px-1.5"}>
                      {s.is_open ? "● Open" : "● Locked"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Last updated: {fmtDate(s.updated_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={s.is_open ? "destructive" : "default"}
                  className="shrink-0 h-8 text-xs gap-1.5"
                  disabled={togglingId === s.id}
                  onClick={() => toggleSession(s)}
                >
                  {togglingId === s.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : s.is_open ? (
                    <><Lock className="h-3.5 w-3.5" /> Lock</>
                  ) : (
                    <><Unlock className="h-3.5 w-3.5" /> Unlock</>
                  )}
                </Button>
              </div>

              {/* Lock message editor */}
              <div className="mt-3 pt-3 border-t border-border/30">
                {editingMsg === s.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={msgDraft}
                      onChange={e => setMsgDraft(e.target.value)}
                      className="h-8 text-xs flex-1"
                      placeholder="Message shown to students when locked..."
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={() => saveMessage(s)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingMsg(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground flex-1 truncate">
                      🔒 Message: "{s.locked_message}"
                    </p>
                    <button
                      className="text-xs text-accent hover:underline shrink-0"
                      onClick={() => { setEditingMsg(s.id); setMsgDraft(s.locked_message); }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visitor Log */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> Visitor Log
            <Badge variant="secondary" className="text-[10px]">{filteredVisitors.length}</Badge>
          </h3>
          <div className="flex gap-2">
            {/* Course filter */}
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="h-8 rounded-md border border-border/50 bg-background text-xs px-2 text-foreground"
            >
              <option value="all">All Courses</option>
              {sessions.map(s => (
                <option key={s.course_id} value={s.course_id}>{s.course_name}</option>
              ))}
            </select>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs w-40"
              />
            </div>
          </div>
        </div>

        {loadingVisitors ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading visitors...</div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No visitors yet</p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-3">Visited</div>
              <div className="col-span-1">Done</div>
              <div className="col-span-2">Score</div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
              {filteredVisitors.map((v, i) => (
                <div key={v.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors items-center">
                  <div className="col-span-1 text-xs text-muted-foreground">{i + 1}</div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {v.user_name || "Anonymous"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {v.user_email || "Not logged in"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs">{COURSE_ICONS[v.course_id] || "📚"} {v.course_id.toUpperCase()}</span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[10px] text-muted-foreground leading-tight">{fmtDate(v.visited_at)}</p>
                  </div>
                  <div className="col-span-1">
                    {v.completed_test
                      ? <span className="text-green-500 text-xs">✓</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                  <div className="col-span-2">
                    {v.score !== null ? (
                      <span className={`text-xs font-semibold ${(v.percentage || 0) >= 60 ? "text-green-400" : "text-red-400"}`}>
                        {v.score}/{v.total_questions} ({v.percentage}%)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
