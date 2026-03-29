import { useEffect, useState } from "react";

interface Particle {
  id: number;
  emoji: string;
  left: number;
  size: number;
  duration: number;
  swayDuration: number;
  delay: number;
}

const EMOJIS = [
  "🍔","🍕","🥤","🧃","🍰","🧁","🍜","🥗",
  "👗","👠","💄","💅","👟","🎀","👜","🧣",
  "📱","💻","🎧","⌚","🖨️","📷","🎮","🖥️",
  "📚","✏️","📝","📖","🖊️","📐","📏","🗂️",
  "🚗","🛵","🚲","🛴",
  "🧴","🌸","💐","🪷","💎","✨","🛍️","📦",
  "🧺","🎯","🎁","💰","🎪","🏪",
];

const TAGS = [
  { emoji: "🍔", label: "Food & Snacks" },
  { emoji: "👗", label: "Fashion" },
  { emoji: "💇", label: "Hair & Beauty" },
  { emoji: "🧴", label: "Toiletries" },
  { emoji: "🌸", label: "Perfumes" },
  { emoji: "📱", label: "Tech & Gadgets" },
  { emoji: "📚", label: "Stationery" },
  { emoji: "🚗", label: "Transport" },
];

// Brand colors from index.css
const NAVY       = "hsl(222, 47%, 20%)";
const NAVY_MID   = "hsl(222, 47%, 30%)";
const NAVY_LIGHT = "hsl(215, 50%, 40%)";
const AMBER      = "hsl(38, 92%, 50%)";
const AMBER_DARK = "hsl(32, 95%, 42%)";

const SplashScreen = ({ onEnter }: { onEnter: () => void }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [entering, setEntering]   = useState(false);
  const [fadeOut, setFadeOut]     = useState(false);

  useEffect(() => {
    const items: Particle[] = EMOJIS.map((emoji, i) => ({
      id: i,
      emoji,
      left: 2 + ((i * 97) / EMOJIS.length) % 94,
      size: 18 + Math.random() * 18,
      duration: 11 + Math.random() * 13,
      swayDuration: 3 + Math.random() * 5,
      delay: -(Math.random() * 24),
    }));
    setParticles(items);
  }, []);

  const handleEnter = () => {
    if (entering) return;
    setEntering(true);
    setTimeout(() => setFadeOut(true), 150);
    setTimeout(() => onEnter(), 750);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 50%, ${NAVY_LIGHT} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", overflow: "hidden",
      transition: "opacity 0.6s ease",
      opacity: fadeOut ? 0 : 1,
    }}>

      {/* Twinkling stars */}
      <Stars />

      {/* Ambient amber glow orbs */}
      <div style={{
        position: "absolute", width: 400, height: 400,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${AMBER}22 0%, transparent 70%)`,
        top: "-10%", right: "-5%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${NAVY_LIGHT}33 0%, transparent 70%)`,
        bottom: "-5%", left: "-5%", pointerEvents: "none",
      }} />

      {/* Floating emoji particles */}
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          bottom: "-60px",
          fontSize: `${p.size}px`,
          animation: `cmFloat ${p.duration}s linear ${p.delay}s infinite, cmSway ${p.swayDuration}s ease-in-out ${p.delay}s infinite`,
          filter: "drop-shadow(0 0 5px rgba(255,255,255,0.2))",
          userSelect: "none", pointerEvents: "none",
        }}>
          {p.emoji}
        </div>
      ))}

      {/* ── Center content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        textAlign: "center", padding: "2rem",
        maxWidth: 420, width: "100%",
      }}>

        {/* Logo ring */}
        <div style={{
          width: 90, height: 90, borderRadius: 26,
          background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 42, margin: "0 auto 1.25rem",
          boxShadow: `0 0 50px ${AMBER}55, 0 0 100px ${AMBER}22`,
          animation: "cmPulse 2.5s ease-in-out infinite",
        }}>
          🛍️
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(30px, 8vw, 42px)",
          fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          background: `linear-gradient(135deg, #ffffff 0%, ${AMBER} 60%, hsl(38,92%,70%) 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: "0 0 0.4rem",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
        }}>
          Campus Market
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "3px",
          textTransform: "uppercase",
          marginBottom: "1.5rem",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Your University Marketplace
        </p>

        {/* Category tags */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 7,
          justifyContent: "center", marginBottom: "2rem",
        }}>
          {TAGS.map((tag) => (
            <span key={tag.label} style={{
              background: "rgba(255,255,255,0.07)",
              border: `1px solid rgba(255,255,255,0.14)`,
              color: "rgba(255,255,255,0.82)",
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              padding: "5px 12px",
              borderRadius: 50,
              display: "flex", alignItems: "center", gap: 5,
              backdropFilter: "blur(4px)",
            }}>
              <span style={{ fontSize: 13 }}>{tag.emoji}</span>
              {tag.label}
            </span>
          ))}
        </div>

        {/* Enter button — uses exact brand amber */}
        <button
          onClick={handleEnter}
          disabled={entering}
          style={{
            background: entering
              ? "rgba(255,255,255,0.1)"
              : `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
            border: "none",
            color: entering ? "rgba(255,255,255,0.5)" : "hsl(222, 47%, 11%)",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            padding: "14px 44px",
            borderRadius: 50,
            cursor: entering ? "default" : "pointer",
            animation: entering ? "none" : "cmBtnPulse 2.2s ease-in-out infinite",
            letterSpacing: "0.3px",
            transition: "all 0.3s ease",
            boxShadow: entering ? "none" : `0 8px 30px ${AMBER}55`,
          }}
        >
          {entering ? "Loading… ✨" : "Enter Marketplace →"}
        </button>

        {/* Hint */}
        <p style={{
          marginTop: "1.1rem", fontSize: 11,
          color: "rgba(255,255,255,0.28)",
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.5px",
        }}>
          Buy · Sell · Connect on campus
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes cmFloat {
          0%   { transform: translateY(0) rotate(0deg) scale(0.85); opacity: 0; }
          6%   { opacity: 0.85; }
          94%  { opacity: 0.85; }
          100% { transform: translateY(-110vh) rotate(380deg) scale(1.1); opacity: 0; }
        }
        @keyframes cmSway {
          0%, 100% { margin-left: 0; }
          25%  { margin-left: 38px; }
          75%  { margin-left: -38px; }
        }
        @keyframes cmPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 50px ${AMBER}55; }
          50%       { transform: scale(1.07); box-shadow: 0 0 80px ${AMBER}88; }
        }
        @keyframes cmBtnPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes cmTwinkle {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(2); }
        }
      `}</style>
    </div>
  );
};

// Star background
const Stars = () => {
  const AMBER_STAR = "hsl(38, 92%, 70%)";
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 2,
    duration: 1.5 + Math.random() * 3.5,
    delay: Math.random() * 5,
    // Every 5th star is amber-tinted, rest are white
    color: i % 5 === 0 ? AMBER_STAR : "white",
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute",
          left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size,
          borderRadius: "50%",
          background: s.color,
          animation: `cmTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
};

export default SplashScreen;
