import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VendorCard from "@/components/marketplace/VendorCard";
import SearchFilters from "@/components/marketplace/SearchFilters";
import { useVendors } from "@/hooks/useVendors";
import { useSchools } from "@/hooks/useSchools";
import { useCampusLocations } from "@/hooks/useCampusLocations";
import { Loader2, Star, ShieldCheck, Trophy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Browse = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedSchool,   setSelectedSchool]   = useState(searchParams.get("school") || "all");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [votw,             setVotw]             = useState<any>(null);

  const { schools }    = useSchools();
  const { locations }  = useCampusLocations(selectedSchool !== "all" ? selectedSchool : undefined);
  const { vendors, isLoading } = useVendors({
    schoolId:        selectedSchool   !== "all" ? selectedSchool   : undefined,
    category:        selectedCategory !== "all" ? selectedCategory : undefined,
    campusLocationId:selectedLocation !== "all" ? selectedLocation : undefined,
    searchQuery:     searchQuery || undefined,
  });

  useEffect(() => { setSelectedLocation("all"); }, [selectedSchool]);

  // Fetch vendor of the week
  useEffect(() => {
    const fetchVotw = async () => {
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("vendors")
        .select("id, business_name, category, description, contact_number, is_verified, is_approved, schools(name), vendor_images(image_url, is_primary)")
        .eq("is_vendor_of_week", true)
        .eq("is_approved", true)
        .gt("vendor_of_week_expires_at", now)
        .maybeSingle();
      setVotw(data || null);
    };
    fetchVotw();
  }, []);

  // Sort: promoted → verified → everyone else
  const sortedVendors = useMemo(() => {
    const now = new Date();
    const rank = (v: any) => {
      if (v.is_vendor_of_week && v.vendor_of_week_expires_at && new Date(v.vendor_of_week_expires_at) > now) return 0;
      const isPromoted = v.promoted_until && new Date(v.promoted_until) > now;
      if (isPromoted)    return 1;
      if (v.is_verified) return 2;
      return 3;
    };
    return [...(vendors || [])].sort((a, b) => {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [vendors]);

  const promotedCount = sortedVendors.filter((v: any) => v.promoted_until && new Date(v.promoted_until) > new Date()).length;
  const verifiedCount = sortedVendors.filter((v: any) => v.is_verified).length;

  const votwImage = votw?.vendor_images?.find((i: any) => i.is_primary)?.image_url
    || votw?.vendor_images?.[0]?.image_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">

          {/* ── Vendor of the Week Spotlight ── */}
          {votw && (
            <div className="mb-8 relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-r from-yellow-500/10 via-amber-400/5 to-yellow-500/10">
              {/* Glow accents */}
              <div className="absolute top-0 left-0 w-40 h-40 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row items-center gap-4 p-5 sm:p-6">
                {/* Image */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-lg shadow-yellow-400/20">
                    {votwImage ? (
                      <img src={votwImage} alt={votw.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-yellow-400/20 flex items-center justify-center">
                        <span className="text-3xl">🏪</span>
                      </div>
                    )}
                  </div>
                  {/* Trophy badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md">
                    <Trophy className="h-4 w-4 text-yellow-900" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 border-0 text-xs font-semibold px-2.5">
                      🏆 Vendor of the Week
                    </Badge>
                    {votw.is_verified && (
                      <Badge className="bg-primary/10 text-primary text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{votw.business_name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {votw.category}
                    {votw.schools?.name && ` · ${votw.schools.name}`}
                  </p>
                  {votw.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 max-w-lg">{votw.description}</p>
                  )}
                </div>

                {/* CTA */}
                <div className="shrink-0">
                  <Button
                    className="bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 hover:from-yellow-300 hover:to-amber-300 font-semibold border-0 shadow-md shadow-yellow-400/30"
                    asChild
                  >
                    <Link to={`/vendor/${votw.id}`}>
                      View Store <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Header row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h1 className="text-3xl font-bold">Browse Marketplace</h1>
            {!isLoading && (promotedCount > 0 || verifiedCount > 0) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {promotedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> Featured
                  </span>
                )}
                {verifiedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified
                  </span>
                )}
                <span className="text-muted-foreground/50">· sorted by rank</span>
              </div>
            )}
          </div>

          <SearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedSchool={selectedSchool}
            onSchoolChange={setSelectedSchool}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            schools={schools}
            locations={locations}
          />

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedVendors.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {promotedCount > 0 && (
                <div className="flex items-center gap-2 mt-8 mb-3">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-foreground">Featured Vendors</span>
                  <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">{promotedCount}</Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
                {sortedVendors.map((vendor: any, index: number) => {
                  const now         = new Date();
                  const isPromoted  = vendor.promoted_until && new Date(vendor.promoted_until) > now;
                  const prevVendor  = sortedVendors[index - 1] as any;
                  const prevPromoted = prevVendor && prevVendor.promoted_until && new Date(prevVendor.promoted_until) > now;

                  const showVerifiedDivider =
                    vendor.is_verified && !isPromoted &&
                    (index === 0 || prevPromoted || (prevVendor && !prevVendor.is_verified));
                  const showAllDivider =
                    !vendor.is_verified && !isPromoted &&
                    prevVendor &&
                    (prevVendor.is_verified || (prevVendor.promoted_until && new Date(prevVendor.promoted_until) > now));

                  return (
                    <>
                      {showVerifiedDivider && (
                        <div key={`div-verified-${vendor.id}`} className="col-span-full flex items-center gap-2 mt-4 mb-1">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Verified Vendors</span>
                          <Badge className="bg-primary/10 text-primary text-xs">{verifiedCount}</Badge>
                        </div>
                      )}
                      {showAllDivider && (
                        <div key={`div-all-${vendor.id}`} className="col-span-full flex items-center gap-2 mt-4 mb-1">
                          <span className="text-sm font-semibold text-foreground">All Vendors</span>
                        </div>
                      )}
                      <VendorCard key={vendor.id} vendor={vendor} index={index} />
                    </>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Browse;
