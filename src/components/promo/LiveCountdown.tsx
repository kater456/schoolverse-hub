import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";
import { getTimeParts } from "@/hooks/useLiveDeals";

interface LiveCountdownProps {
  expiresAt: string;
  variant?: "blocks" | "simple";
  onExpired?: () => void;
}

export const LiveCountdown = ({
  expiresAt,
  variant = "simple",
  onExpired,
}: LiveCountdownProps) => {
  const [parts, setParts] = useState(() => getTimeParts(expiresAt));
  const onExpiredRef = useRef(onExpired);

  // Keep ref up to date to avoid effect re-triggering when callback changes
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    // Initial check
    const initialParts = getTimeParts(expiresAt);
    setParts(initialParts);
    if (initialParts.isEnded) {
      onExpiredRef.current?.();
      return;
    }

    const interval = setInterval(() => {
      const currentParts = getTimeParts(expiresAt);
      setParts(currentParts);
      if (currentParts.isEnded) {
        clearInterval(interval);
        onExpiredRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const pad = (num: number) => String(num).padStart(2, "0");

  if (parts.isEnded) {
    return <span className="text-destructive font-semibold">Ended</span>;
  }

  if (variant === "simple") {
    const formatted = parts.days > 0
      ? `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s left`
      : `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)} left`;

    return (
      <span className="text-[10px] font-medium text-orange-600 flex items-center gap-1">
        <Clock className="h-3 w-3" /> {formatted}
      </span>
    );
  }

  // "blocks" variant for the Carousel Card UI.
  // Visual reference design uses boxed digits with labels underneath.
  // We'll show a DAYS block if days > 0, otherwise we'll show Hours, Minutes, and Seconds.
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {parts.days > 0 && (
        <>
          <div className="flex flex-col items-center">
            <div className="bg-orange-500/10 text-orange-600 font-bold rounded px-1.5 py-0.5 text-xs min-w-[24px] text-center border border-orange-500/20">
              {pad(parts.days)}
            </div>
            <span className="text-[8px] text-muted-foreground font-semibold mt-0.5">DAYS</span>
          </div>
          <span className="text-orange-500/50 font-bold text-xs pb-3">:</span>
        </>
      )}

      <div className="flex flex-col items-center">
        <div className="bg-orange-500/10 text-orange-600 font-bold rounded px-1.5 py-0.5 text-xs min-w-[24px] text-center border border-orange-500/20">
          {pad(parts.days > 0 ? parts.hours : parts.hours + parts.days * 24)}
        </div>
        <span className="text-[8px] text-muted-foreground font-semibold mt-0.5">HRS</span>
      </div>
      <span className="text-orange-500/50 font-bold text-xs pb-3">:</span>

      <div className="flex flex-col items-center">
        <div className="bg-orange-500/10 text-orange-600 font-bold rounded px-1.5 py-0.5 text-xs min-w-[24px] text-center border border-orange-500/20">
          {pad(parts.minutes)}
        </div>
        <span className="text-[8px] text-muted-foreground font-semibold mt-0.5">MINS</span>
      </div>
      <span className="text-orange-500/50 font-bold text-xs pb-3">:</span>

      <div className="flex flex-col items-center">
        <div className="bg-orange-500/10 text-orange-600 font-bold rounded px-1.5 py-0.5 text-xs min-w-[24px] text-center border border-orange-500/20">
          {pad(parts.seconds)}
        </div>
        <span className="text-[8px] text-muted-foreground font-semibold mt-0.5">SECS</span>
      </div>
    </div>
  );
};
