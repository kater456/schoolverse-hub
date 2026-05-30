/**
 * VendorProximity.tsx
 * ===================
 * Live proximity card shown on vendor profile pages.
 * Shows distance, walking estimate, live tracking toggle,
 * and navigation buttons (Google Maps, Apple Maps, copy address).
 *
 * PLACEMENT: src/components/vendor/VendorProximity.tsx
 *
 * USAGE in VendorProfile.tsx (below the vendor header card):
 *   import VendorProximity from "@/components/vendor/VendorProximity";
 *   {vendor.location && <VendorProximity vendor={vendor} />}
 */

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Navigation, MapPin, Copy, Check, Map,
  Radio, AlertCircle, ChevronRight, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Haversine ────────────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function walkMinutes(m: number) {
  return Math.round(m / (1000 / 15)); // 15 min/km walking
}

// ─── Parse vendor location from geography ─────────────────────────────────────
function parseVendorCoords(vendor: any): { lat: number; lng: number } | null {
  // Supabase returns geography as GeoJSON or WKB hex
  if (vendor.location_lat != null && vendor.location_lng != null) {
    return { lat: Number(vendor.location_lat), lng: Number(vendor.location_lng) };
  }
  if (vendor.latitude != null && vendor.longitude != null) {
    return { lat: Number(vendor.latitude), lng: Number(vendor.longitude) };
  }
  // GeoJSON format { type: "Point", coordinates: [lng, lat] }
  if (vendor.location?.coordinates) {
    const [lng, lat] = vendor.location.coordinates;
    return { lat, lng };
  }
  return null;
}

// ─── Status config ────────────────────────────────────────────────────────────
function getStatus(distM: number) {
  if (distM < 500) return {
    color:  "bg-green-500",
    ring:   "ring-green-400/50",
    label:  "You're very close!",
    sub:    `Less than ${fmtDistance(distM)} away`,
    text:   "text-green-700",
    bg:     "bg-green-50 border-green-200",
  };
  if (distM < 2000) return {
    color:  "bg-amber-400",
    ring:   "ring-amber-300/50",
    label:  `About ${walkMinutes(distM)} min walk`,
    sub:    `${fmtDistance(distM)} away`,
    text:   "text-amber-700",
    bg:     "bg-amber-50 border-amber-200",
  };
  return {
    color:  "bg-red-400",
    ring:   "ring-red-300/50",
    label:  "This vendor is far away",
    sub:    `${fmtDistance(distM)} from you`,
    text:   "text-red-700",
    bg:     "bg-red-50 border-red-200",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VendorProximity({ vendor }: { vendor: any }) {
  const { toast } = useToast();
  const vendorCoords = parseVendorCoords(vendor);

  const [userCoords,   setUserCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [distance,     setDistance]     = useState<number | null>(null);
  const [permDenied,   setPermDenied]   = useState(false);
  const [tracking,     setTracking]     = useState(false);
  const [approach,     setApproach]     = useState<"closer" | "further" | null>(null);
  const [copied,       setCopied]       = useState(false);

  const prevDistRef  = useRef<number | null>(null);
  const watchIdRef   = useRef<number | null>(null);

  // ── One-time silent geolocation on mount ───────────────────────────────────
  useEffect(() => {
    if (!vendorCoords) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(u);
        setDistance(haversineDistance(u.lat, u.lng, vendorCoords.lat, vendorCoords.lng));
      },
      () => setPermDenied(true),
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  // ── Live tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tracking || !vendorCoords) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(u);
        const newDist = haversineDistance(u.lat, u.lng, vendorCoords.lat, vendorCoords.lng);
        setDistance(newDist);

        if (prevDistRef.current !== null) {
          const diff = newDist - prevDistRef.current;
          if (diff < -20)       setApproach("closer");
          else if (diff > 100)  setApproach("further");
          else                  setApproach(null);
        }
        prevDistRef.current = newDist;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tracking]);

  const stopTracking = () => {
    setTracking(false);
    setApproach(null);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const copyAddress = () => {
    const parts = [vendor.address, vendor.landmark, vendor.city].filter(Boolean);
    const text = parts.length ? parts.join(" · ") : "Address not set";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({ title: "Address copied!", description: text });
    });
  };

  if (!vendorCoords && !vendor.address && !vendor.city) return null;

  const status = distance !== null ? getStatus(distance) : null;

  return (
    <div className="space-y-3">
      {/* ── Distance card ── */}
      {distance !== null && status && (
        <div className={`rounded-2xl border p-4 ${status.bg}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {/* Pulsing dot */}
              <div className="relative flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <div className={`absolute inset-0 w-3 h-3 rounded-full ${status.color} animate-ping opacity-60`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${status.text}`}>{status.label}</p>
                <p className={`text-xs ${status.text} opacity-70`}>{status.sub}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${status.text} tabular-nums`}>
                {fmtDistance(distance)}
              </p>
              {distance >= 500 && (
                <p className={`text-[10px] ${status.text} opacity-60`}>
                  ~{walkMinutes(distance)} min walk
                </p>
              )}
            </div>
          </div>

          {/* Approach indicator */}
          {tracking && approach && (
            <div className={`flex items-center gap-2 text-xs font-semibold mb-3 px-3 py-2 rounded-xl ${
              approach === "closer"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
              {approach === "closer"
                ? <><Target className="h-3.5 w-3.5" /> 🎯 You're on track — getting closer!</>
                : <><AlertCircle className="h-3.5 w-3.5" /> ↩️ You may have passed it or taken a wrong turn</>}
            </div>
          )}

          {/* Track toggle */}
          <button
            onClick={() => tracking ? stopTracking() : setTracking(true)}
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl transition-all ${
              tracking
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : `bg-white/60 ${status.text} hover:bg-white/80`
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${tracking ? "animate-pulse" : ""}`} />
            {tracking ? "Stop Live Tracking" : "Track My Approach"}
          </button>

          <p className="text-[9px] text-center opacity-40 mt-2">
            Your location is never stored — only used to calculate distance
          </p>
        </div>
      )}

      {/* Permission denied */}
      {permDenied && !distance && (
        <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Enable location in your browser to see how far this vendor is from you.
          </p>
        </div>
      )}

      {/* ── Location info box ── */}
      {(vendor.address || vendor.city || vendor.landmark) && (
        <div className="rounded-2xl border border-border/50 bg-background divide-y divide-border/40 overflow-hidden">
          {vendor.address && (
            <div className="flex items-start gap-3 px-4 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Address</p>
                <p className="text-sm text-foreground">{vendor.address}</p>
              </div>
            </div>
          )}
          {vendor.city && (
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="text-sm mt-0.5">🏙️</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">City / Area</p>
                <p className="text-sm text-foreground">{vendor.city}</p>
              </div>
            </div>
          )}
          {vendor.landmark && (
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="text-sm mt-0.5">🗺️</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Landmark</p>
                <p className="text-sm text-foreground">{vendor.landmark}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation buttons ── */}
      {vendorCoords && (
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${vendorCoords.lat},${vendorCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full h-11 flex-col gap-0.5 text-xs font-semibold p-2">
              <Map className="h-4 w-4 text-blue-500" />
              <span className="text-[10px]">Google Maps</span>
            </Button>
          </a>

          <a
            href={`https://maps.apple.com/?daddr=${vendorCoords.lat},${vendorCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full h-11 flex-col gap-0.5 text-xs font-semibold p-2">
              <Navigation className="h-4 w-4 text-gray-600" />
              <span className="text-[10px]">Apple Maps</span>
            </Button>
          </a>

          <Button
            variant="outline"
            className="h-11 flex-col gap-0.5 text-xs font-semibold p-2"
            onClick={copyAddress}
          >
            {copied
              ? <Check className="h-4 w-4 text-green-500" />
              : <Copy className="h-4 w-4 text-muted-foreground" />}
            <span className="text-[10px]">{copied ? "Copied!" : "Copy Address"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
