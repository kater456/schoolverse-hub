/**
 * VendorLocationSettings.tsx
 * ==========================
 * Location capture & update section for the vendor dashboard Settings tab.
 *
 * PLACEMENT: src/components/vendor/VendorLocationSettings.tsx
 *
 * USAGE in VendorDashboard.tsx Settings TabsContent, above VendorLiveLocation:
 *   import VendorLocationSettings from "@/components/vendor/VendorLocationSettings";
 *   <VendorLocationSettings vendor={vendor} onUpdate={(v) => setVendor((p: any) => ({ ...p, ...v }))} />
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  vendor:   any;
  onUpdate: (partial: any) => void;
}

export default function VendorLocationSettings({ vendor, onUpdate }: Props) {
  const { toast } = useToast();
  const [city,     setCity]     = useState(vendor.city     || "");
  const [address,  setAddress]  = useState(vendor.address  || "");
  const [landmark, setLandmark] = useState(vendor.landmark || "");
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [capturing,setCapturing]= useState(false);
  const [saving,   setSaving]   = useState(false);

  const hasLocation = !!(vendor.city || vendor.address || vendor.location);

  const captureGPS = () => {
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCapturing(false);
        toast({ title: "📍 Location captured!", description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` });
      },
      (err) => {
        setCapturing(false);
        toast({ title: "GPS failed", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const update: any = { city, address, landmark };

      if (coords) {
        // Store as WKT point string — PostGIS accepts this via text cast
        update.location = `POINT(${coords.lng} ${coords.lat})`;
      }

      const { error } = await supabase
        .from("vendors")
        .update(update)
        .eq("id", vendor.id);

      if (error) throw error;

      onUpdate(update);
      toast({ title: "Location saved ✓", description: "Your store location has been updated." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Store Location
          {hasLocation
            ? <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Location set ✓
              </span>
            : <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Location not set ⚠️
              </span>
          }
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GPS capture */}
        <Button
          variant="outline"
          className={`w-full gap-2 h-11 font-semibold ${coords ? "border-green-300 text-green-700 bg-green-50" : "border-blue-200 text-blue-700"}`}
          onClick={captureGPS}
          disabled={capturing}
        >
          {capturing
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Navigation className="h-4 w-4" />}
          {coords
            ? `📍 GPS captured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : capturing
              ? "Getting your location…"
              : "Use My Current GPS Location"}
        </Button>

        {!coords && vendor.location && (
          <p className="text-xs text-muted-foreground text-center">
            ✓ GPS coordinates already saved. Recapture to update.
          </p>
        )}

        {/* Text fields */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">City / Area</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Yaba, Lagos"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Street Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12 Herbert Macaulay Way"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Landmark / Directions</Label>
            <Input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Beside GTBank, opposite the cafeteria"
              className="mt-1 h-10"
            />
          </div>
        </div>

        <Button
          className="w-full gap-2 h-10"
          onClick={save}
          disabled={saving || (!city && !address && !coords)}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Location
        </Button>
      </CardContent>
    </Card>
  );
}