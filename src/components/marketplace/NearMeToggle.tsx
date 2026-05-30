/**
 * NearMeToggle.tsx
 * ================
 * "Near Me" proximity filter for the marketplace/browse page.
 * Calls the get_nearby_vendors Supabase RPC function.
 *
 * PLACEMENT: src/components/marketplace/NearMeToggle.tsx
 *
 * USAGE in your Browse/Marketplace page, above the vendor grid:
 *   import NearMeToggle from "@/components/marketplace/NearMeToggle";
 *   <NearMeToggle onResults={setNearbyVendors} onClear={() => setNearbyVendors(null)} />
 *
 *   Then in your vendor grid:
 *   {nearbyVendors ? nearbyVendors.map(...) : allVendors.map(...)}
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NearbyVendor {
  id:               string;
  business_name:    string;
  category:         string;
  city:             string;
  address:          string;
  landmark:         string;
  profile_image_url:string;
  is_verified:      boolean;
  is_store_upgraded:boolean;
  average_rating:   number;
  distance_m:       number;
}

interface Props {
  onResults: (vendors: NearbyVendor[]) => void;
  onClear:   () => void;
}

function distanceBadge(m: number) {
  const label = m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
  if (m < 1000)  return { label, className: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" };
  if (m < 5000)  return { label, className: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-400" };
  return           { label, className: "bg-red-100   text-red-700   border-red-200",    dot: "bg-red-400"   };
}

export { distanceBadge };
export type { NearbyVendor };

export default function NearMeToggle({ onResults, onClear }: Props) {
  const { toast } = useToast();
  const [active,      setActive]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [citySearch,  setCitySearch]  = useState("");
  const [showCity,    setShowCity]    = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const fetchNearby = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.rpc("get_nearby_vendors", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radius_km: 10,
          });
          if (error) throw error;
          const results = (data as NearbyVendor[]) || [];
          onResults(results);
          setResultCount(results.length);
          setActive(true);
          setLoading(false);
          if (results.length === 0) {
            toast({ title: "No vendors nearby", description: "No vendors found within 10km. Try city search instead." });
          }
        } catch (err: any) {
          setLoading(false);
          toast({ title: "Location error", description: err.message, variant: "destructive" });
        }
      },
      () => {
        setLoading(false);
        setShowCity(true);
        toast({ title: "Location denied", description: "Search by city instead." });
      },
      { timeout: 8000 }
    );
  };

  const clearNearby = () => {
    setActive(false);
    setShowCity(false);
    setCitySearch("");
    setResultCount(null);
    onClear();
  };

  return (
    <div className="space-y-2">
      {!active && !showCity && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
          onClick={fetchNearby}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <MapPin className="h-3.5 w-3.5" />}
          Near Me
        </Button>
      )}

      {active && resultCount !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm">
          <MapPin className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <span className="text-blue-700 font-medium flex-1">
            Showing {resultCount} vendor{resultCount !== 1 ? "s" : ""} within 10km
          </span>
          <button onClick={clearNearby} className="text-blue-400 hover:text-blue-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showCity && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by city or area…"
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                // Let parent handle text filter — emit null to reset to text-filtered list
                if (!e.target.value) onClear();
              }}
              className="pl-8 h-9 text-sm rounded-full"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowCity(false); onClear(); }}
            className="h-9 px-2 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
