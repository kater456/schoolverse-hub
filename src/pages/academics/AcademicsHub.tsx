import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const CSS = `
  @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.6} }
  @keyframes shimmer { 0%{background-position:-200% center}100%{background-position:200% center} }
  .acad-card { animation: fadeSlideUp 0.4s ease both; transition: all 0.25s ease; cursor: pointer; }
  .acad-card:hover { transform: translateY(-4px) scale(1.01); }
  .acad-badge-pulse { animation: pulse 2.5s infinite; }
  .shimmer-text {
    background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }
`;

interface CourseCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  desc: string;
  tags: string[];
  color: string;
  questions: number;
  route: string;
  badge?: string;
  badgeColor?: string;
  available: boolean;
}

const COURSES: CourseCard[] = [
  {
    id: "bic1",
    emoji: "🧬",
    title: "Medical Biochemistry",
    subtitle: "BIC 1 · UNEC 2nd Year MBBS/BDS",
    desc: "220-question bank covering Carbohydrates, Lipids, Amino Acids, Nucleotides, and Enzymes. 4 question types: MCQ, Matching, Multi-Statement & Assertion-Reason.",
    tags: ["MCQ","Matching","Multi-Statement","Assertion-Reason","AI Analysis"],
    color: "#34d399",
    questions: 220,
    route: "/academics/bic1",
    badge: "🔥 Available Now",
    badgeColor: "#10b981",
    available: true,
  },
  {
    id: "physio",
    emoji: "🫀",
    title: "Physiology",
    subtitle: "MBBS/BDS/PHT · UNEC 2nd Year",
    desc: "300+ question bank for UNEC Physiology 1st Test. Covers Neuromuscular, Cell Biology, Blood, and Cardiac/ANS with AI Analysis.",
    tags: ["MCQ","AI Analysis"],
    color: "#38bdf8",
    questions: 302,
    route: "/academics/physio",
    badge: "🔥 Available Now",
    badgeColor: "#38bdf8",
    available: true,
  },
  {
    id: "anatomy",
    emoji: "🦴",
    title: "Anatomy",
    subtitle: "Upper Limb · UNEC 1st Year",
    desc: "Upper limb anatomy questions with diagrams. Bones, joints, muscles, nerves and vessels covered.",
    tags: ["MCQ","Diagrams"],
    color: "#60a5fa",
    questions: 303,
    route: "/academics/anatomy",
    badge: "Coming Soon",
    badgeColor: "#3b82f6",
    available: false,
  },
  {
    id: "histology",
    emoji: "🔬",
    title: "Histology",
    subtitle: "UNEC 1st Year MBBS",
    desc: "80+ questions covering tissue types, cell structures, and organ histology with visual mnemonics.",
    tags: ["MCQ","Visual"],
    color: "#f472b6",
    questions: 80,
    route: "/academics/histology",
    badge: "Coming Soon",
    badgeColor: "#ec4899",
    available: false,
  },
  {
    id: "embryology",
    emoji: "🥚",
    title: "Embryology",
    subtitle: "MBBS · UNEC",
    desc: "261 questions spanning fertilization, organogenesis, and clinical correlates. 4 question types.",
    tags: ["MCQ","Multi-Statement","Assertion-Reason"],
    color: "#fb923c",
    questions: 261,
    route: "/academics/embryology",
    badge: "Coming Soon",
    badgeColor: "#f97316",
    available: false,
  },
];

export default function AcademicsHub() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{CSS}</style>
      <Navbar />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "32px 0 28px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🎓</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>
            UNEC Academics Hub
          </h1>
          <p style={{ color: "#475569", fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto 16px" }}>
            CBT practice for UNEC Medical & Dental students — real exam questions, AI-powered feedback, and instant results
          </p>
          {/* Campus Market Banner */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(135deg,#064e3b,#0c2a1a)", border: "1px solid #10b981", borderRadius: "12px", padding: "10px 18px" }}>
            <span style={{ fontSize: "1.3rem" }}>🛍️</span>
            <div style={{ textAlign: "left" }}>
              <div className="shimmer-text" style={{ fontWeight: 700, fontSize: "0.82rem" }}>Powered by Campus Market App</div>
              <div style={{ color: "#6ee7b7", fontSize: "0.72rem" }}>campusmarketapp.com · Insure Your Business Success</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "28px" }}>
          {[
            { label: "Questions", value: "860+", icon: "❓" },
            { label: "Courses", value: `${COURSES.filter(c => c.available).length} Live`, icon: "📚" },
            { label: "Exam Types", value: "4 Types", icon: "🧪" },
          ].map(s => (
            <div key={s.label} style={{ background: "#0c1420", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "3px" }}>{s.icon}</div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1rem" }}>{s.value}</div>
              <div style={{ color: "#334155", fontSize: "0.72rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Course Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {COURSES.map((c, i) => (
            <div
              key={c.id}
              className="acad-card"
              style={{
                background: "#0c1420",
                border: `1px solid ${c.available ? c.color + "44" : "#1e3a5f"}`,
                borderRadius: "18px",
                padding: "20px",
                animationDelay: `${i * 80}ms`,
                opacity: c.available ? 1 : 0.6,
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => c.available && navigate(c.route)}
            >
              {/* Glow */}
              {c.available && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${c.color}88, transparent)` }} />
              )}

              {/* Badge */}
              {c.badge && (
                <div className={c.available ? "acad-badge-pulse" : ""} style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: `${c.badgeColor}22`, border: `1px solid ${c.badgeColor}55`,
                  borderRadius: "6px", padding: "2px 9px", fontSize: "0.68rem",
                  color: c.badgeColor, fontWeight: 600, marginBottom: "12px"
                }}>
                  {c.badge}
                </div>
              )}

              {/* Title */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
                <span style={{ fontSize: "2rem", lineHeight: 1 }}>{c.emoji}</span>
                <div>
                  <h2 style={{ color: "#e2e8f0", fontSize: "1rem", fontWeight: 700, margin: "0 0 2px", fontFamily: "Georgia, serif" }}>{c.title}</h2>
                  <p style={{ color: c.color, fontSize: "0.73rem", fontWeight: 600, margin: 0 }}>{c.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 12px" }}>{c.desc}</p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "14px" }}>
                {c.tags.map(tag => (
                  <span key={tag} style={{ background: "#111827", border: `1px solid ${c.color}22`, color: "#475569", borderRadius: "5px", padding: "2px 8px", fontSize: "0.68rem" }}>{tag}</span>
                ))}
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontSize: "0.74rem" }}>📦 {c.questions} questions</span>
                {c.available ? (
                  <button style={{
                    background: `linear-gradient(135deg,${c.color}cc,${c.color})`,
                    border: "none", borderRadius: "8px", padding: "7px 16px",
                    color: "#060b14", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer"
                  }}>
                    Start CBT →
                  </button>
                ) : (
                  <span style={{ color: "#1e3a5f", fontSize: "0.78rem", fontWeight: 600 }}>Locked 🔒</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Campus Market CTA */}
        <div style={{ marginTop: "32px", background: "linear-gradient(135deg,#064e3b,#0c2a1a)", border: "1px solid #10b981", borderRadius: "18px", padding: "24px 22px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2.5rem" }}>🛍️</span>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                Insure Your Business with Campus Market App
              </div>
              <p style={{ color: "#6ee7b7", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
                You study hard — now let Campus Market help your business grow. List products, accept payments, and reach thousands of UNEC students. <strong>campusmarketapp.com</strong>
              </p>
            </div>
            <button
              onClick={() => window.open("https://campusmarketapp.com", "_blank")}
              style={{ background: "linear-gradient(135deg,#059669,#10b981)", border: "none", borderRadius: "10px", padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Visit Campus Market →
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
