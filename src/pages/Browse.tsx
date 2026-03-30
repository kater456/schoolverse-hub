import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VendorCard from "@/components/marketplace/VendorCard";
import SearchFilters from "@/components/marketplace/SearchFilters";
import { useVendors } from "@/hooks/useVendors";
import { useSchools } from "@/hooks/useSchools";
import { useCampusLocations } from "@/hooks/useCampusLocations";
import { Loader2, Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Browse = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState(searchParams.get("school") || "all");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const { schools } = useSchools();
  const { locations } = useCampusLocations(selectedSchool !== "all" ? selectedSchool : undefined);
  const { vendors, isLoading } = useVendors({
    schoolId: selectedSchool !== "all" ? selectedSchool : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    campusLocationId: selectedLocation !== "all" ? selectedLocation : undefined,
    searchQuery: searchQuery || undefined,
  });

  useEffect(() => {
    setSelectedLocation("all");
  }, [selectedSchool]);

  // Sort: promoted (active) → verified → everyone else (newest first)
  const sortedVendors = useMemo(() => {
    const now = new Date();

    const rank = (v: any) => {
      const isPromoted = v.promoted_until && new Date(v.promoted_until) > now;
      if (isPromoted)  return 0; // top
      if (v.is_verified) return 1; // second
      return 2;                    // everyone else
    };

    return [...(vendors || [])].sort((a, b) => {
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      // Within same rank, newest first
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [vendors]);

  const promotedCount  = sortedVendors.filter((v: any) => v.promoted_until && new Date(v.promoted_until) > new Date()).length;
  const verifiedCount  = sortedVendors.filter((v: any) => v.is_verified).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h1 className="text-3xl font-bold">Browse Marketplace</h1>

            {/* Legend — only show if there are promoted or verified vendors */}
            {!isLoading && (promotedCount > 0 || verifiedCount > 0) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {promotedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    Featured
                  </span>
                )}
                {verifiedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Verified
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
              {/* Promoted section header */}
              {promotedCount > 0 && (
                <div className="flex items-center gap-2 mt-8 mb-3">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-foreground">Featured Vendors</span>
                  <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">
                    {promotedCount}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                {sortedVendors.map((vendor: any, index: number) => {
                  const now = new Date();
                  const isPromoted = vendor.promoted_until && new Date(vendor.promoted_until) > now;

                  // Show "Verified" section divider
                  const prevVendor = sortedVendors[index - 1] as any;
                  const prevPromoted = prevVendor && prevVendor.promoted_until && new Date(prevVendor.promoted_until) > now;
                  const showVerifiedDivider =
                    vendor.is_verified &&
                    !isPromoted &&
                    (index === 0 || prevPromoted || (prevVendor && !prevVendor.is_verified));

                  // Show "All Vendors" divider
                  const showAllDivider =
                    !vendor.is_verified &&
                    !isPromoted &&
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
                      <VendorCard key={vendor.id} vendor={vendor} />
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
