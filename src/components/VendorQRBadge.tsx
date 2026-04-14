import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VendorQRBadgeProps {
  vendorId: string;
  businessName: string;
  /** Optionally override the URL encoded in the QR. Defaults to current vendor profile URL. */
  profileUrl?: string;
  /** Size of the QR image in px (default 300) */
  size?: number;
}

/**
 * Renders the blue "Registered Business" badge with a live QR code inside
 * the white box (matching the design in the uploaded screenshot), plus a
 * downloadable PNG link for the vendor.
 */
const VendorQRBadge = ({
  vendorId,
  businessName,
  profileUrl,
  size = 280,
}: VendorQRBadgeProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  // Build the URL that will be encoded in the QR code
  const qrTargetUrl =
    profileUrl ||
    `${window.location.origin}/vendor/${vendorId}`;

  // QR code image from free QR API (no npm install needed)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    qrTargetUrl
  )}&bgcolor=ffffff&color=1a2a6c&qzone=1&format=png`;

  // High-res version for download
  const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
    qrTargetUrl
  )}&bgcolor=ffffff&color=1a2a6c&qzone=1&format=png`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(qrDownloadUrl);
      if (!res.ok) throw new Error("Failed to fetch QR image");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${businessName.replace(/\s+/g, "_")}_QR_Code.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast({ title: "QR Code downloaded ✅" });
    } catch {
      // Fallback: open in new tab
      window.open(qrDownloadUrl, "_blank");
      toast({ title: "Opened QR in new tab" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ── Badge card ── */}
      <div
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
        {/* Subtle corner glow overlay */}
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
          {/* Graduation-cap bag icon — matches the uploaded design */}
          <svg
            viewBox="0 0 40 40"
            width="34"
            height="34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Bag body */}
            <rect x="8" y="18" width="24" height="18" rx="3" fill="#c8d8f0" />
            {/* Bag handle */}
            <path
              d="M15 18v-3a5 5 0 0 1 10 0v3"
              stroke="#8aabdc"
              strokeWidth="2"
              fill="none"
            />
            {/* Letter S */}
            <text
              x="20"
              y="32"
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#1a3a8f"
              fontFamily="serif"
            >
              S
            </text>
            {/* Graduation cap */}
            <polygon points="20,4 32,10 20,16 8,10" fill="#c8d8f0" />
            <rect x="28" y="10" width="2" height="6" rx="1" fill="#8aabdc" />
            <circle cx="29" cy="17" r="2" fill="#8aabdc" />
          </svg>
        </div>

        {/* Title */}
        <p
          className="relative z-10 text-center tracking-[0.2em] text-[13px] font-semibold"
          style={{
            color: "#c8deff",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing: "0.22em",
          }}
        >
          REGISTERED BUSINESS
        </p>

        {/* White QR box */}
        <div
          className="relative z-10 flex items-center justify-center rounded-2xl overflow-hidden"
          style={{
            width: 220,
            height: 220,
            background: "#f0f4ff",
            boxShadow: "0 4px 28px rgba(0,0,0,0.45)",
          }}
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

        {/* Vendor name below QR */}
        <p
          className="relative z-10 text-center text-[11px] max-w-[200px] truncate"
          style={{ color: "#7eb8ff" }}
        >
          {businessName}
        </p>
      </div>

      {/* ── Download button ── */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-blue-400/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {downloading ? "Preparing download…" : "Download QR Code"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center max-w-[220px]">
        Scan to visit this business profile
      </p>
    </div>
  );
};

export default VendorQRBadge;
