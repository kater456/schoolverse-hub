import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VendorCard from "@/components/marketplace/VendorCard";
import SearchFilters from "@/components/marketplace/SearchFilters";
import { useVendors } from "@/hooks/useVendors";
import { useSchools } from "@/hooks/useSchools";
import { useCampusLocations } from "@/hooks/useCampusLocations";
import { Loader2 } from "lucide-react";

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

  // Reset location when school changes
  useEffect(() => {
    setSelectedLocation("all");
  }, [selectedSchool]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-6">Browse Marketplace</h1>

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
          ) : vendors.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Browse;
