import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import html from "@/assets/anatomy-test-bank.html?raw";

export default function AnatomyTestBank() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#060b14", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Navbar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "1400px", margin: "0 auto", padding: "16px 12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 4px 12px" }}>
          <Link
            to="/academics"
            style={{ color: "#6ee7b7", fontSize: "0.88rem", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            ← Back to Academics
          </Link>
          <span style={{ color: "#334155", fontSize: "0.78rem" }}>·</span>
          <span style={{ color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600 }}>🦴 Anatomy Test Bank — 538 Questions</span>
        </div>

        <iframe
          title="Anatomy Test Bank"
          srcDoc={html}
          style={{ width: "100%", flex: 1, minHeight: "80vh", border: 0, borderRadius: "14px", display: "block", background: "#fffdf9" }}
        />
      </main>

      <Footer />
    </div>
  );
}
