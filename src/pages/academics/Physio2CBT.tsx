import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PAST_Q, CVS_Q, P2Question } from "@/data/physio2Questions";

const LABELS = ["A", "B", "C", "D", "E"];

type PartKey = "past" | "cvs";

interface PartMeta {
  key: PartKey;
  icon: string;
  title: string;
  tagline: string;
  bank: P2Question[];
  color: string;
  secs: Record<number, { col: string; icon: string; title: string; rule: string }>;
}

const PARTS: Record<PartKey, PartMeta> = {
  past: {
    key: "past",
    icon: "📚",
    title: "Past Questions",
    tagline: "UNEC departmental past questions — GIT, Cardiovascular & Renal Physiology",
    bank: PAST_Q,
    color: "#34d399",
    secs: {
      1: { col: "#34d399", icon: "🍽️", title: "Gastrointestinal Physiology", rule: "Select the ONE most correct answer from options A–E." },
      2: { col: "#38bdf8", icon: "🫀", title: "Cardiovascular Physiology", rule: "Select the ONE most correct answer from options A–E." },
      3: { col: "#a78bfa", icon: "💧", title: "Renal Physiology", rule: "Select the ONE most correct answer from options A–E." },
    },
  },
  cvs: {
    key: "cvs",
    icon: "🫀",
    title: "Know Your CVS",
    tagline: "Full cardiovascular mastery bank — from anatomy to ECG and disorders",
    bank: CVS_Q,
    color: "#f87171",
    secs: {
      1: { col: "#f87171", icon: "🫀", title: "Physiology of the CVS", rule: "Select the ONE most correct answer from options A–E." },
      2: { col: "#fb923c", icon: "🩸", title: "Blood Flow in Special Areas", rule: "Select the ONE most correct answer from options A–E." },
      3: { col: "#34d399", icon: "💓", title: "Heart Rate & Cardiac Output", rule: "Select the ONE most correct answer from options A–E." },
      4: { col: "#38bdf8", icon: "📈", title: "Electrocardiography", rule: "Select the ONE most correct answer from options A–E." },
      5: { col: "#fbbf24", icon: "⚠️", title: "CV Disorders", rule: "Select the ONE most correct answer from options A–E." },
    },
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pct = (c: number, t: number) => (t === 0 ? 0 : Math.round((c / t) * 100));

function downloadAllQuestions(part: PartMeta) {
  const secNums = Object.keys(part.secs).map(Number);
  const secGroups: Record<number, P2Question[]> = {};
  secNums.forEach((s) => (secGroups[s] = []));
  part.bank.forEach((q) => secGroups[q.s]?.push(q));

  const qHTML = secNums.map((s) => {
    const qs = secGroups[s];
    if (!qs.length) return "";
    return `
      <div style="background:${part.secs[s].col}18;border-left:4px solid ${part.secs[s].col};padding:10px 16px;margin:28px 0 16px;border-radius:4px;">
        <strong style="color:${part.secs[s].col};">${part.secs[s].icon} Section ${s}: ${part.secs[s].title}</strong>
      </div>
      ${qs
        .map(
          (q, qi) => `
        <div style="margin-bottom:14px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid;">
          <p style="font-weight:600;margin:0 0 8px;font-size:0.95rem;">${qi + 1}. ${q.q}</p>
          ${q.o
            .map(
              (o, i) =>
                `<div style="margin:3px 0 3px 12px;font-size:0.875rem;${i === q.a ? "color:#16a34a;font-weight:700;" : ""}">${LABELS[i]}. ${o}${i === q.a ? " ✓" : ""}</div>`
            )
            .join("")}
          <div style="margin-top:6px;font-size:0.75rem;color:#94a3b8;">Topic: ${q.t}</div>
          <div style="margin-top:3px;font-size:0.75rem;color:#64748b;">Why: ${q.e}</div>
        </div>
      `
        )
        .join("")}
    `;
  }).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <title>UNEC Physiology 2nd Test — ${part.title} | campusmarketapp.com</title>
  <style>body{font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:28px 24px;font-size:14px;}@media print{body{padding:16px}@page{margin:1.2cm}}</style>
  </head><body>
  <div style="text-align:center;border-bottom:3px solid ${part.color};padding-bottom:20px;margin-bottom:28px;">
    <div style="font-size:2.5rem;margin-bottom:6px;">${part.icon}</div>
    <h1 style="font-size:1.6rem;margin:0 0 4px;">UNEC Physiology — 2nd Test · ${part.title}</h1>
    <h2 style="font-size:1.1rem;font-weight:400;color:#475569;margin:0 0 10px;">Question Bank with Answers & Explanations (${part.bank.length} Questions)</h2>
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:2px solid #10b981;border-radius:10px;padding:12px 20px;display:inline-block;margin-bottom:8px;">
      <div style="color:#10b981;font-weight:700;font-size:1rem;">🛍️ Powered by Campus Market App</div>
      <div style="color:#6ee7b7;font-size:0.85rem;margin-top:2px;">campusmarketapp.com · Insure Your Business · Nigeria's #1 Student Marketplace</div>
    </div>
  </div>
  ${qHTML}
  <div style="text-align:center;margin-top:40px;border-top:2px solid #e2e8f0;padding-top:20px;">
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:1px solid #10b981;border-radius:10px;padding:16px 24px;display:inline-block;">
      <div style="color:#10b981;font-weight:700;font-size:1.1rem;">🛍️ Campus Market App · campusmarketapp.com</div>
      <div style="color:#a7f3d0;font-size:0.8rem;margin-top:4px;">Insure Your Business · Build Your Future · Conquer Every Exam</div>
    </div>
  </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

const renderMd = (text: string) =>
  text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} style={{ color: "#60a5fa", fontFamily: "Georgia,serif", marginTop: "1.4rem", marginBottom: "0.4rem", borderBottom: "1px solid #1e3a5f", paddingBottom: "4px", fontSize: "1rem" }}>{line.slice(3)}</h3>;
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) return <li key={i} style={{ marginLeft: "1.2rem", color: "#cbd5e1", lineHeight: "1.65", marginBottom: "3px", fontSize: "0.88rem" }}>{line.replace(/^[-*]\s/, "")}</li>;
    if (line.includes("Campus Market")) return <div key={i} style={{ background: "linear-gradient(135deg,#0d2a1e,#0d1f38)", border: "1px solid #10b981", borderRadius: "12px", padding: "14px 18px", margin: "1rem 0", color: "#6ee7b7", fontWeight: "700", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.7" }}>{line}</div>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ color: "#cbd5e1", lineHeight: "1.65", marginBottom: "2px", fontSize: "0.88rem" }}>{line}</p>;
  });

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}.opt{transition:all .2s;cursor:pointer}.opt:hover{transform:translateX(3px)}
.pulse{animation:pulse 2s infinite}.fadeIn{animation:fadeIn .45s ease}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}`;

const QUESTIONS_PER_SESSION = 100;

export default function Physio2CBT() {
  const { user } = useAuth();
  const [part, setPart] = useState<PartMeta | null>(null);
  const [qs, setQs] = useState<P2Question[]>([]);
  const [phase, setPhase] = useState<"intro" | "test" | "loading" | "results">("intro");
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [acked, setAcked] = useState(new Set<number>());
  const [analysis, setAnalysis] = useState<any>(null);
  const [sessionOpen, setSessionOpen] = useState<boolean | null>(null);
  const [lockedMessage, setLockedMessage] = useState("This session is currently locked by the admin.");
  const visitorLogId = useRef<string | null>(null);

  useEffect(() => {
    const checkAndLog = async () => {
      try {
        const { data: session } = await (supabase as any).from("academic_sessions").select("is_open, locked_message").eq("course_id", "physio2").maybeSingle();
        const open = session ? session.is_open : true;
        setSessionOpen(open);
        if (session?.locked_message) setLockedMessage(session.locked_message);
        if (open) {
          const { data: logEntry } = await (supabase as any).from("academic_visitors").insert({ course_id: "physio2", user_id: user?.id || null, user_email: user?.email || null, user_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || null, completed_test: false }).select("id").single();
          if (logEntry?.id) visitorLogId.current = logEntry.id;
        }
      } catch {
        setSessionOpen(true);
      }
    };
    checkAndLog();
  }, [user]);

  const logCompletion = async (score: number, total: number) => {
    if (!visitorLogId.current) return;
    await (supabase as any).from("academic_visitors").update({ completed_test: true, score, total_questions: total, percentage: Math.round((score / total) * 100) }).eq("id", visitorLogId.current);
  };

  const q = qs[idx];
  const si = q && part ? part.secs[q.s] : null;
  const showSecIntro = phase === "test" && q && si && !acked.has(q.s);

  const startExam = (p: PartMeta) => {
    setPart(p);
    setQs(shuffle(p.bank).slice(0, Math.min(QUESTIONS_PER_SESSION, p.bank.length)).sort((a, b) => a.s - b.s));
    setAns({}); setSel(null); setAcked(new Set()); setAnalysis(null); setIdx(0); setPhase("test");
  };

  const selOpt = (i: number) => { if (sel !== null) return; setSel(i); setAns((p) => ({ ...p, [idx]: i })); };
  const goNext = () => {
    if (sel === null) return;
    if (idx < qs.length - 1) { const ni = idx + 1; setIdx(ni); setSel(ans[ni] !== undefined ? ans[ni] : null); }
    else submitTest();
  };
  const goBack = () => { if (idx <= 0) return; const pi = idx - 1; setIdx(pi); setSel(ans[pi] !== undefined ? ans[pi] : null); };

  const submitTest = async () => {
    setPhase("loading");
    const score = qs.reduce((acc, q, i) => acc + (ans[i] === q.a ? 1 : 0), 0);
    await logCompletion(score, qs.length);
    const secNums = part ? Object.keys(part.secs).map(Number) : [];
    const ss: Record<number, number> = {}, sn: Record<number, number> = {};
    const topics: Record<string, { c: number; n: number }> = {};
    qs.forEach((q, i) => {
      sn[q.s] = (sn[q.s] || 0) + 1; if (ans[i] === q.a) ss[q.s] = (ss[q.s] || 0) + 1;
      if (!topics[q.t]) topics[q.t] = { c: 0, n: 0 }; topics[q.t].n++; if (ans[i] === q.a) topics[q.t].c++;
    });
    const tStr = Object.entries(topics).map(([k, v]) => `${k}: ${v.c}/${v.n} (${pct(v.c, v.n)}%)`).join("\n");
    const sStr = secNums.filter((s) => sn[s] > 0).map((s) => `${part!.secs[s].title}: ${ss[s] || 0}/${sn[s]} (${pct(ss[s] || 0, sn[s])}%)`).join(" | ");
    const bankLabel = part ? `${part.title} (${part.bank.length}-question bank)` : "2nd Test";
    const prompt = `A 2nd Year MBBS/BDS/PHT student at UNEC completed a Physiology 2nd Test CBT — ${bankLabel}, 100 randomly selected questions.

Score: ${score}/100 (${pct(score, 100)}%)
${sStr}

Topic Performance:
${tStr}

Provide a detailed medical physiology educator analysis:

## 📊 Performance Summary
(Warm 2-3 sentences. MBBS pass is typically 50%)

## 💪 Strengths
(Sections/topics ≥ 70% — specific physiological praise with clinical significance)

## 📚 Areas to Strengthen
(Sections/topics < 60% — kind but direct feedback with specific concepts to revisit)

## 🎯 Study Recommendations
(4-5 targeted study strategies for weakest topics — include clinical correlations and mnemonics)

## 🧪 Practice Questions
(4 new MCQs with 5 options each targeting the 2 weakest topics. Mark ✅ correct answer)

## 🏆 Final Word
End ONLY with: "🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!"`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || "").join("\n") || "Analysis unavailable.";
      setAnalysis({ score, ss, sn, topics, text });
    } catch {
      setAnalysis({ score, ss, sn, topics, text: `## 📊 Performance Summary\nYou completed the Physiology 2nd Test CBT — ${part?.title || ""}!\n\nScore: ${score}/100 (${pct(score, 100)}%).\n\n## 🏆 Final Word\n🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!` });
    }
    setPhase("results");
  };

  if (sessionOpen === null)
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", flexDirection: "column", gap: "12px" }}>
        <style>{CSS}</style>
        <div className="pulse" style={{ fontSize: "2.5rem" }}>🫀</div>
        <p style={{ color: "#475569", fontSize: "0.88rem" }}>Checking session status...</p>
      </div>
    );

  if (sessionOpen === false)
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{CSS}</style>
        <div className="fadeIn" style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "12px" }}>🔒</div>
          <h1 style={{ fontFamily: "'Crimson Pro',serif", color: "#e2e8f0", fontSize: "1.8rem", margin: "0 0 8px" }}>Session Locked</h1>
          <div style={{ background: "#0c1420", border: "1px solid #ef444433", borderRadius: "14px", padding: "18px 20px", marginBottom: "20px" }}>
            <p style={{ color: "#fca5a5", fontSize: "0.92rem", lineHeight: "1.7", margin: 0 }}>{lockedMessage}</p>
          </div>
          <div style={{ background: "linear-gradient(135deg,#064e3b,#0c2a1a)", border: "1px solid #10b981", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px" }}>
            <div style={{ color: "#10b981", fontWeight: "700", fontSize: "0.88rem" }}>🛍️ Campus Market App · campusmarketapp.com</div>
          </div>
          <button onClick={() => window.history.back()} style={{ background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "11px 28px", color: "#475569", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Go Back</button>
        </div>
      </div>
    );

  if (phase === "intro")
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{CSS}</style>
        <div className="fadeIn" style={{ maxWidth: "580px", width: "100%" }}>
          <div style={{ background: "linear-gradient(135deg,#064e3b,#0c1a0c)", border: "1px solid #10b981", borderRadius: "14px", padding: "13px 18px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🛍️</span>
            <div>
              <div style={{ color: "#10b981", fontWeight: "700", fontSize: "0.85rem" }}>Campus Market App · campusmarketapp.com</div>
              <div style={{ color: "#6ee7b7", fontSize: "0.75rem" }}>Insure your business success · Nigeria's #1 Student Marketplace</div>
            </div>
            <div style={{ marginLeft: "auto", background: "#10b98122", border: "1px solid #10b981", borderRadius: "7px", padding: "3px 10px", color: "#10b981", fontSize: "0.7rem", fontWeight: "700" }}>POWERED BY</div>
          </div>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🫀</div>
            <h1 style={{ fontFamily: "'Crimson Pro',serif", fontSize: "2rem", fontWeight: "700", color: "#e2e8f0", margin: "0 0 4px" }}>Physiology — 2nd Test CBT</h1>
            <p style={{ color: "#334155", fontSize: "0.78rem", marginBottom: "4px" }}>MBBS/BDS/PHT 2024/2025 · UNEC · Department of Physiology</p>
            <p style={{ color: "#475569", fontSize: "0.78rem", margin: 0 }}>Two Banks · {QUESTIONS_PER_SESSION} Random Questions Per Session · AI Analysis</p>
          </div>

          {(Object.keys(PARTS) as PartKey[]).map((k) => {
            const p = PARTS[k];
            const secNums = Object.keys(p.secs).map(Number);
            return (
              <div key={k} style={{ background: "#0c1420", border: `1px solid ${p.color}44`, borderRadius: "16px", padding: "16px 20px", marginBottom: "14px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span style={{ fontSize: "1.8rem", lineHeight: 1 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: "'Crimson Pro',serif", color: "#e2e8f0", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 2px" }}>{p.title}</h2>
                    <p style={{ color: p.color, fontSize: "0.74rem", fontWeight: 600, margin: 0 }}>{p.tagline}</p>
                  </div>
                  <span style={{ background: `${p.color}15`, color: p.color, borderRadius: "6px", padding: "3px 9px", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>{p.bank.length} Qs</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {secNums.map((s) => (
                    <span key={s} style={{ background: "#111827", border: `1px solid ${p.secs[s].col}33`, color: p.secs[s].col, borderRadius: "5px", padding: "3px 9px", fontSize: "0.68rem", fontWeight: 600 }}>
                      {p.secs[s].icon} {p.secs[s].title}
                    </span>
                  ))}
                </div>
                <div style={{ background: "#0c1420", border: "1px solid #7c3aed33", borderRadius: "10px", padding: "8px 14px", marginBottom: "12px", fontSize: "0.74rem", color: "#a78bfa", textAlign: "center" }}>
                  🔀 {QUESTIONS_PER_SESSION} questions randomly drawn from this {p.bank.length}-question bank — every session is unique!
                </div>
                <button onClick={() => startExam(p)} style={{ width: "100%", background: `linear-gradient(135deg,${p.color}cc,${p.color})`, border: "none", borderRadius: "12px", padding: "13px", color: "#060b14", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .2s" }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.01)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >Start {p.title} →</button>
              </div>
            );
          })}

          <div style={{ background: "#064e3b22", border: "1px solid #10b98144", borderRadius: "9px", padding: "7px 14px", fontSize: "0.73rem", color: "#6ee7b7", textAlign: "center" }}>
            🛍️ Powered by Campus Market App · campusmarketapp.com
          </div>
        </div>
      </div>
    );

  if (showSecIntro && si && part)
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{CSS}</style>
        <div className="fadeIn" style={{ maxWidth: "460px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>{si.icon}</div>
          <h2 style={{ fontFamily: "'Crimson Pro',serif", color: "#e2e8f0", fontSize: "1.7rem", margin: "0 0 16px" }}>{si.title}</h2>
          <div style={{ background: "#0c1420", border: `1px solid ${si.col}44`, borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
            <p style={{ color: "#94a3b8", lineHeight: "1.7", margin: 0, fontSize: "0.88rem" }}>{si.rule}</p>
          </div>
          <div style={{ background: "#064e3b22", border: "1px solid #10b98144", borderRadius: "9px", padding: "7px 14px", marginBottom: "18px", fontSize: "0.73rem", color: "#6ee7b7" }}>
            🛍️ Powered by Campus Market App · campusmarketapp.com
          </div>
          <button onClick={() => setAcked((p) => new Set([...p, q.s]))} style={{ background: `linear-gradient(135deg,${si.col}cc,${si.col})`, border: "none", borderRadius: "12px", padding: "13px 36px", color: "#060b14", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>
            Start Section →
          </button>
        </div>
      </div>
    );

  if (phase === "loading")
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", textAlign: "center", color: "#94a3b8" }}>
        <style>{CSS}</style>
        <div>
          <div className="pulse" style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🫀</div>
          <h2 style={{ fontFamily: "'Crimson Pro',serif", color: "#e2e8f0", marginBottom: "8px" }}>Marking Your Paper...</h2>
          <p style={{ fontSize: "0.9rem" }}>AI is analysing your physiology answers</p>
          <div style={{ marginTop: "18px", display: "flex", gap: "8px", justifyContent: "center" }}>
            {[0, 1, 2, 3].map((i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", animation: `pulse ${0.6 + i * 0.15}s ${i * 0.15}s infinite` }} />)}
          </div>
          <div style={{ marginTop: "20px", background: "#064e3b22", border: "1px solid #10b98144", borderRadius: "9px", padding: "7px 18px", fontSize: "0.72rem", color: "#6ee7b7" }}>
            🛍️ Campus Market · campusmarketapp.com
          </div>
        </div>
      </div>
    );

  if (phase === "results" && analysis && part) {
    const { score, ss, sn, topics, text } = analysis;
    const grd = score >= 80 ? "A+" : score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : score >= 40 ? "D" : "F";
    const gCol = score >= 60 ? "#34d399" : score >= 50 ? "#fbbf24" : "#ef4444";
    const secNums = Object.keys(part.secs).map(Number);
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", fontFamily: "'DM Sans',sans-serif", padding: "16px 16px 36px" }}>
        <style>{CSS}</style>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "16px 0 14px" }}>
            <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: "3.8rem", fontWeight: 700, color: gCol, lineHeight: 1 }}>{score}<span style={{ fontSize: "1.8rem", color: "#475569" }}>/100</span></div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: gCol, marginBottom: "4px" }}>Grade {grd} · {pct(score, 100)}%</div>
            <p style={{ color: "#475569", fontSize: "0.78rem", margin: 0 }}>Physiology 2nd Test · {part.title} · UNEC</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginBottom: "12px" }}>
            {secNums.map((s) => {
              if (!sn[s]) return null;
              const c = part.secs[s].col, p = pct(ss[s] || 0, sn[s]);
              return (<div key={s} style={{ background: "#0c1420", border: `1px solid ${c}33`, borderRadius: "11px", padding: "12px" }}>
                <div style={{ color: c, fontSize: "0.7rem", fontWeight: 600, marginBottom: "5px" }}>{part.secs[s].icon} {part.secs[s].title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.05rem" }}>{ss[s] || 0}/{sn[s]}</span>
                  <span style={{ color: p >= 70 ? "#34d399" : p >= 50 ? "#fbbf24" : "#ef4444", fontSize: "0.8rem", fontWeight: 600 }}>{p}%</span>
                </div>
                <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p}%`, background: c, borderRadius: "2px" }} />
                </div>
              </div>);
            })}
          </div>
          <div style={{ background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "13px", padding: "15px", marginBottom: "12px" }}>
            <h3 style={{ color: "#93c5fd", fontFamily: "'Crimson Pro',serif", margin: "0 0 10px", fontSize: "0.92rem" }}>📊 Topic Breakdown</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Object.entries(topics).map(([t, v]: any) => {
                const p = pct(v.c, v.n), col = p >= 70 ? "#34d399" : p >= 50 ? "#fbbf24" : "#ef4444";
                return (<div key={t} style={{ background: "#111827", border: `1px solid ${col}44`, borderRadius: "7px", padding: "5px 10px" }}>
                  <div style={{ color: "#e2e8f0", fontSize: "0.72rem", fontWeight: 600 }}>{t}</div>
                  <div style={{ color: col, fontSize: "0.69rem" }}>{v.c}/{v.n} · {p}%</div>
                </div>);
              })}
            </div>
          </div>
          <button onClick={() => downloadAllQuestions(part)} style={{ width: "100%", background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", border: "1px solid #3b82f6", borderRadius: "12px", padding: "13px", color: "#93c5fd", fontSize: "0.9rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, transition: "all .2s", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            📥 Download All {part.bank.length} {part.title} Questions + Answers (Print/PDF)
          </button>
          <div style={{ background: "linear-gradient(135deg,#064e3b,#0c2a1a)", border: "1px solid #10b981", borderRadius: "13px", padding: "16px 18px", marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.8rem" }}>🛍️</span>
              <div>
                <div style={{ color: "#10b981", fontWeight: "700", fontSize: "0.92rem", marginBottom: "3px" }}>Insure Your Business with Campus Market App</div>
                <p style={{ color: "#6ee7b7", fontSize: "0.8rem", lineHeight: "1.6", margin: 0 }}>List products, reach campus buyers, grow with confidence. <strong>campusmarketapp.com</strong> — Nigeria's #1 student marketplace.</p>
              </div>
            </div>
          </div>
          <div style={{ background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "13px", padding: "18px", marginBottom: "12px" }}>
            <h3 style={{ color: "#93c5fd", fontFamily: "'Crimson Pro',serif", margin: "0 0 10px", fontSize: "0.92rem" }}>🤖 AI Analysis & Recommendations</h3>
            <div style={{ maxHeight: "52vh", overflowY: "auto", paddingRight: "4px" }}>{renderMd(text)}</div>
          </div>
          <button onClick={() => part && startExam(part)} style={{ width: "100%", background: "linear-gradient(135deg,#064e3b,#065f46)", border: "1px solid #10b981", borderRadius: "12px", padding: "12px", color: "#10b981", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: "8px" }}>
            🔀 New Shuffle — Retake with Different {QUESTIONS_PER_SESSION} Questions
          </button>
          <button onClick={() => { setPhase("intro"); setQs([]); setPart(null); }} style={{ width: "100%", background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "12px", color: "#475569", fontSize: "0.86rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            ← Back to Intro
          </button>
        </div>
      </div>
    );
  }

  if (phase !== "test" || !q || !si || !part) return null;
  const progP = pct(idx + 1, qs.length);
  const secNums = Object.keys(part.secs).map(Number);

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", fontFamily: "'DM Sans',sans-serif", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: "620px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "3px" }}>
            {secNums.map((s) => <div key={s} style={{ height: "3px", width: "32px", borderRadius: "2px", background: q.s > s ? "#1e3a5f" : q.s === s ? si.col : "#0f172a" }} />)}
          </div>
          <div style={{ background: "#064e3b22", border: "1px solid #10b98144", borderRadius: "6px", padding: "2px 8px", fontSize: "0.63rem", color: "#10b981", fontWeight: 600 }}>🛍️ Campus Market</div>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: si.col, fontSize: "0.74rem", fontWeight: 600 }}>{si.icon} {si.title}</span>
            <span style={{ color: "#334155", fontSize: "0.74rem" }}>{idx + 1} / {qs.length}</span>
          </div>
          <div style={{ height: "3px", background: "#0c1420", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progP}%`, background: `linear-gradient(90deg,${si.col}77,${si.col})`, transition: "width .4s ease" }} />
          </div>
        </div>
        <div style={{ background: "#0c1420", border: `1px solid ${si.col}33`, borderRadius: "17px", padding: "18px", marginBottom: "10px" }}>
          <div style={{ marginBottom: "10px" }}>
            <span style={{ background: `${si.col}15`, color: si.col, padding: "2px 9px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600 }}>{q.t}</span>
          </div>
          <p style={{ color: "#e2e8f0", fontSize: "0.97rem", fontWeight: 600, lineHeight: "1.65", margin: "0 0 14px", fontFamily: "'Crimson Pro',serif" }}>{q.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {q.o.map((opt, i) => {
              let bg = "#111827", border = "#1e293b", col = "#94a3b8";
              if (sel !== null) { if (i === q.a) { bg = "#0a2a1a"; border = "#22c55e"; col = "#86efac"; } else if (i === sel && sel !== q.a) { bg = "#2a0a0a"; border = "#ef4444"; col = "#fca5a5"; } }
              return (<button key={i} className="opt" onClick={() => selOpt(i)} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "9px", padding: "9px 12px", textAlign: "left", display: "flex", gap: "8px", alignItems: "flex-start", color: col, opacity: sel !== null && i !== q.a && i !== sel ? 0.35 : 1, fontSize: "0.86rem", lineHeight: "1.5", cursor: "pointer" }}>
                <span style={{ minWidth: "21px", height: "21px", borderRadius: "5px", background: `${border}33`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.73rem", color: border, flexShrink: 0, marginTop: "1px" }}>{LABELS[i]}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {sel !== null && i === q.a && <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>}
                {sel !== null && i === sel && sel !== q.a && <span style={{ color: "#ef4444", flexShrink: 0 }}>✗</span>}
              </button>);
            })}
          </div>
        </div>
        {sel !== null && (
          <div style={{ background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "11px", padding: "10px 14px", marginBottom: "10px", fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.6" }}>
            <span style={{ color: ans[idx] === q.a ? "#34d399" : "#f87171", fontWeight: 700 }}>{ans[idx] === q.a ? "✓ Correct — " : "✗ Not quite — "}</span>{q.e}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <button onClick={goBack} disabled={idx === 0} style={{ flex: 1, background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "9px", padding: "11px", color: idx === 0 ? "#1e293b" : "#475569", cursor: idx === 0 ? "not-allowed" : "pointer", fontSize: "0.84rem" }}>← Back</button>
          <button onClick={goNext} disabled={sel === null} style={{ flex: 2.5, background: sel === null ? "#0c1420" : `linear-gradient(135deg,${si.col}cc,${si.col})`, border: sel === null ? "1px solid #1e3a5f" : "none", borderRadius: "9px", padding: "11px", color: sel === null ? "#1e293b" : "#060b14", cursor: sel === null ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.88rem", transition: "all .2s" }}>
            {idx === qs.length - 1 ? "Submit Examination 🎯" : "Next →"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "4px", flexWrap: "wrap" }}>
          {qs.filter((qq) => qq.s === q.s).map((qq, i) => {
            const qi = qs.indexOf(qq), a = ans[qi];
            return (<div key={i} onClick={() => { setIdx(qi); setSel(ans[qi] !== undefined ? ans[qi] : null); }} style={{ width: "7px", height: "7px", borderRadius: "50%", cursor: "pointer", background: a === undefined ? "#1e293b" : a === qq.a ? "#22c55e" : "#ef4444", opacity: qi === idx ? 1 : 0.55, border: qi === idx ? `1px solid ${si.col}` : "none", transition: "all .2s" }} />);
          })}
        </div>
      </div>
    </div>
  );
}
