import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VendorQRBadgeProps {
  vendorId: string;
  businessName: string;
  profileUrl?: string;
  size?: number;
}

const VendorQRBadge = ({
  vendorId,
  businessName,
  profileUrl,
  size = 280,
}: VendorQRBadgeProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const qrTargetUrl =
    profileUrl || `${window.location.origin}/vendor/${vendorId}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    qrTargetUrl
  )}&bgcolor=ffffff&color=1a2a6c&qzone=1&format=png`;

  // Download the whole badge as a canvas-rendered PNG
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // 1. Fetch QR image as blob → dataURL
      const qrRes = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
          qrTargetUrl
        )}&bgcolor=ffffff&color=1a2a6c&qzone=1&format=png`
      );
      if (!qrRes.ok) throw new Error("QR fetch failed");
      const qrBlob = await qrRes.blob();
      const qrDataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });

      // 2. Draw the entire badge onto a canvas
      const W = 560;
      const H = 680;
      const canvas = document.createElement("canvas");
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Background gradient (dark blue)
      const bgGrad = ctx.createLinearGradient(0, 0, W * 0.6, H);
      bgGrad.addColorStop(0, "rgba(20,44,130,0.95)");
      bgGrad.addColorStop(1, "rgba(5,10,45,0.98)");
      ctx.fillStyle = bgGrad;
      // Rounded rect
      const r = 44;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(W - r, 0);
      ctx.quadraticCurveTo(W, 0, W, r);
      ctx.lineTo(W, H - r);
      ctx.quadraticCurveTo(W, H, W - r, H);
      ctx.lineTo(r, H);
      ctx.quadraticCurveTo(0, H, 0, H - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = "rgba(80,150,255,0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Corner glow overlay
      const glowGrad = ctx.createLinearGradient(0, 0, W * 0.5, H * 0.4);
      glowGrad.addColorStop(0, "rgba(100,170,255,0.18)");
      glowGrad.addColorStop(1, "rgba(100,170,255,0)");
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Icon circle background
      const iconX = W / 2;
      const iconY = 90;
      const iconR = 50;
      const iconGrad = ctx.createLinearGradient(iconX - iconR, iconY - iconR, iconX + iconR, iconY + iconR);
      iconGrad.addColorStop(0, "#1a3a9f");
      iconGrad.addColorStop(1, "#0a1840");
      ctx.beginPath();
      ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
      ctx.fillStyle = iconGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(100,160,255,0.65)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Icon text (S)
      ctx.font = "bold 44px Georgia, serif";
      ctx.fillStyle = "#c8d8f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", iconX, iconY + 2);

      // "REGISTERED BUSINESS" title
      ctx.font = "600 22px Georgia, serif";
      ctx.fillStyle = "#c8deff";
      ctx.letterSpacing = "8px";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("REGISTERED BUSINESS", W / 2, 175);

      // White QR box
      const qrBoxW = 420;
      const qrBoxH = 420;
      const qrBoxX = (W - qrBoxW) / 2;
      const qrBoxY = 205;
      const qrBoxR = 24;
      ctx.beginPath();
      ctx.moveTo(qrBoxX + qrBoxR, qrBoxY);
      ctx.lineTo(qrBoxX + qrBoxW - qrBoxR, qrBoxY);
      ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY, qrBoxX + qrBoxW, qrBoxY + qrBoxR);
      ctx.lineTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH - qrBoxR);
      ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH, qrBoxX + qrBoxW - qrBoxR, qrBoxY + qrBoxH);
      ctx.lineTo(qrBoxX + qrBoxR, qrBoxY + qrBoxH);
      ctx.quadraticCurveTo(qrBoxX, qrBoxY + qrBoxH, qrBoxX, qrBoxY + qrBoxH - qrBoxR);
      ctx.lineTo(qrBoxX, qrBoxY + qrBoxR);
      ctx.quadraticCurveTo(qrBoxX, qrBoxY, qrBoxX + qrBoxR, qrBoxY);
      ctx.closePath();
      ctx.fillStyle = "#f0f4ff";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw QR image inside white box
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        qrImg.onload = () => res();
        qrImg.onerror = rej;
        qrImg.src = qrDataUrl;
      });
      const pad = 16;
      ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxW - pad * 2, qrBoxH - pad * 2);

      // Business name below QR box
      ctx.font = "500 20px Georgia, serif";
      ctx.fillStyle = "#7eb8ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Truncate if too long
      let displayName = businessName;
      while (ctx.measureText(displayName).width > W - 60 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== businessName) displayName += "…";
      ctx.fillText(displayName, W / 2, qrBoxY + qrBoxH + 38);

      // 3. Export canvas as PNG and trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = `${businessName.replace(/\s+/g, "_")}_Registered_Badge.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast({ title: "Badge downloaded ✅" });
      }, "image/png");

    } catch (err) {
      console.error("Badge download error:", err);
      // Fallback — just download QR code
      window.open(
        `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrTargetUrl)}&bgcolor=ffffff&color=1a2a6c&qzone=1&format=png`,
        "_blank"
      );
      toast({ title: "Opened QR in new tab (badge download unavailable)" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ── Badge card (visual preview) ── */}
      <div
        ref={badgeRef}
        className="relative flex flex-col items-center gap-4 rounded-[22px] px-6 py-6"
        style={{
          background:
            "linear-gradient(160deg, rgba(20,44,130,0.75) 0%, rgba(5,10,45,0.92) 100%)",
          border: "1.5px solid rgba(80,150,255,0.55)",
          boxShadow:
            "0 0 40px rgba(30,80,255,0.3), inset 0 0 60px rgba(40,100,255,0.06)",
          width: 280,
        }}
      >
        {/* Corner glow overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(100,170,255,0.18) 0%, transparent 55%, rgba(100,160,255,0.10) 100%)",
          }}
        />

        {/* Icon */}
        <div
          className="relative z-10 flex items-center justify-center rounded-[14px]"
          style={{
            width: 60,
            height: 60,
            background: "linear-gradient(135deg, #1a3a9f, #0a1840)",
            border: "1.5px solid rgba(100,160,255,0.65)",
            boxShadow: "0 0 18px rgba(60,120,255,0.55)",
          }}
        >
          <svg viewBox="0 0 40 40" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="18" width="24" height="18" rx="3" fill="#c8d8f0" />
            <path d="M15 18v-3a5 5 0 0 1 10 0v3" stroke="#8aabdc" strokeWidth="2" fill="none" />
            <text x="20" y="32" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1a3a8f" fontFamily="serif">S</text>
            <polygon points="20,4 32,10 20,16 8,10" fill="#c8d8f0" />
            <rect x="28" y="10" width="2" height="6" rx="1" fill="#8aabdc" />
            <circle cx="29" cy="17" r="2" fill="#8aabdc" />
          </svg>
        </div>

        {/* Title */}
        <p
          className="relative z-10 text-center tracking-[0.2em] text-[13px] font-semibold"
          style={{ color: "#c8deff", fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "0.22em" }}
        >
          REGISTERED BUSINESS
        </p>

        {/* White QR box */}
        <div
          className="relative z-10 flex items-center justify-center rounded-2xl overflow-hidden"
          style={{ width: 220, height: 220, background: "#f0f4ff", boxShadow: "0 4px 28px rgba(0,0,0,0.45)" }}
        >
          <img
            src={qrImageUrl}
            alt={`QR code for ${businessName}`}
            width={200}
            height={200}
            style={{ objectFit: "contain" }}
            loading="lazy"
          />
        </div>

        {/* Business name */}
        <p className="relative z-10 text-center text-[11px] max-w-[200px] truncate" style={{ color: "#7eb8ff" }}>
          {businessName}
        </p>
      </div>

      {/* ── Download full badge button ── */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-blue-400/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {downloading ? "Preparing download…" : "Download Full Badge"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center max-w-[220px]">
        Downloads the full badge image including QR code
      </p>
    </div>
  );
};

export default VendorQRBadge;
