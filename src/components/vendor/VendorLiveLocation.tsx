import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface Props {
  vendor: any;
  userId: string;
}

interface LocationState {
  on: boolean;
  lat: number | null;
  lng: number | null;
  label: string;
}

export default function VendorLiveLocation({ vendor, userId }: Props) {
  const { toast } = useToast();

  const [location, setLocation]       = useState<LocationState>({ on: false, lat: null, lng: null, label: "" });
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [mode, setMode]               = useState<"gps" | "manual">("gps");
  const watchRef = useRef<number | null>(null);

  // ── Fetch current location state ──────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("vendor_presence")
        .select("live_location_on, live_location_lat, live_location_lng, live_location_label")
        .eq("vendor_id", vendor.id)
        .maybeSingle();

      if (data) {
        setLocation({
          on:    data.live_location_on ?? false,
          lat:   data.live_location_lat ?? null,
          lng:   data.live_location_lng ?? null,
          label: data.live_location_label ?? "",
        });
        setManualLabel(data.live_location_label ?? "");
      }
      setLoading(false);
    };
    fetch();

    // Cleanup GPS watch on unmount
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [vendor.id]);

  // ── Save to Supabase ────────────────────────────────────────────────────────
  const saveLocation = async (updates: Partial<LocationState> & { on: boolean }) => {
    setSaving(true);
    try {
      const upsertData: any = {
        vendor_id:            vendor.id,
        user_id:              userId,
        is_online:            true,
        last_seen:            new Date().toISOString(),
        live_location_on:     updates.on,
        live_location_lat:    updates.on ? (updates.lat ?? null) : null,
        live_location_lng:    updates.on ? (updates.lng ?? null) : null,
        live_location_label:  updates.on ? (updates.label ?? "") : null,
        location_updated_at:  new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("vendor_presence")
        .upsert(upsertData, { onConflict: "vendor_id" });

      if (error) throw error;
      setLocation((prev) => ({ ...prev, ...updates }));
    } catch (err: any) {
      toast({ title: "Failed to save location", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // ── Turn OFF location ────────────────────────────────────────────────────────
  const turnOff = async () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    await saveLocation({ on: false, lat: null, lng: null, label: "" });
    setManualLabel("");
    toast({ title: "Live location turned off 🔒", description: "Buyers can no longer see your location." });
  };

  // ── GPS mode ─────────────────────────────────────────────────────────────────
  const enableGPS = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "GPS not available", description: "Your browser does not support location sharing.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await saveLocation({ on: true, lat, lng, label: manualLabel || "Live GPS location" });
        setGpsLoading(false);
        toast({ title: "📍 Live location is ON", description: "Verified buyers can now see your location." });

        // Watch for position updates every ~60s
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = navigator.geolocation.watchPosition(
          async (updated) => {
            await (supabase as any).from("vendor_presence").update({
              live_location_lat:   updated.coords.latitude,
              live_location_lng:   updated.coords.longitude,
              location_updated_at: new Date().toISOString(),
            }).eq("vendor_id", vendor.id);
          },
          undefined,
          { maximumAge: 60000, timeout: 20000, enableHighAccuracy: false }
        );
      },
      (err) => {
        setGpsLoading(false);
        toast({
          title: "Location permission denied",
          description: "Please allow location access in your browser settings, or use the manual option.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Manual mode ─────────────────────────────────────────────────────────────
  const enableManual = async () => {
    if (!manualLabel.trim()) {
      toast({ title: "Enter your location", description: "e.g. 'Engineering Block Entrance' or 'Main Library Steps'", variant: "destructive" });
      return;
    }
    await saveLocation({ on: true, lat: null, lng: null, label: manualLabel.trim() });
    toast({ title: "📍 Live location is ON", description: "Verified buyers can see your location text." });
  };

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );

  // ── Not verified — gate the feature ─────────────────────────────────────────
  if (!vendor.is_verified) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Live Location Sharing</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Get your verified badge to unlock live location sharing. Buyers can find you on campus in real time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-colors ${location.on ? "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-border/50"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${location.on ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
          <MapPin className="h-4 w-4 text-accent" />
          Live Location Sharing
          {location.on && (
            <span className="ml-auto text-[10px] font-normal text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ● LIVE
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Current state — ON */}
        {location.on && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Your location is live
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">
                  {location.label || (location.lat ? "GPS coordinates active" : "Location sharing on")}
                </p>
                {location.lat && (
                  <a
                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 underline mt-0.5 block"
                  >
                    View on Google Maps →
                  </a>
                )}
              </div>
            </div>

            {/* Security warning — always visible when ON */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Reminder:</strong> Turn off your live location when you leave your selling spot.
                Your real-time position is visible to verified buyers.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={turnOff}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5 mr-2" />}
              Turn Off Live Location
            </Button>
          </div>
        )}

        {/* Current state — OFF */}
        {!location.on && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Let verified buyers find you on campus right now. Only verified users can see your live location.
            </p>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              {(["gps", "manual"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    mode === m
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m === "gps"
                    ? <><Navigation className="h-3.5 w-3.5" /> Use GPS</>
                    : <><MapPin className="h-3.5 w-3.5" /> Type Location</>
                  }
                </button>
              ))}
            </div>

            {/* Manual label input */}
            {mode === "manual" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Where are you right now?</Label>
                <Input
                  placeholder="e.g. Engineering Block Entrance, Main Library Steps…"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  className="h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") enableManual(); }}
                />
              </div>
            )}

            {/* GPS label (optional) */}
            {mode === "gps" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Add a label <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="e.g. 'Near the cafeteria' helps buyers find you faster"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}

            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              size="sm"
              onClick={mode === "gps" ? enableGPS : enableManual}
              disabled={saving || gpsLoading}
            >
              {(saving || gpsLoading)
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Getting location…</>
                : <><MapPin className="h-3.5 w-3.5 mr-2" />Go Live</>
              }
            </Button>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Only verified buyers can see your live location.
              Remember to turn it off when you're done selling.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
