import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import type { School } from "@/hooks/useSchools";
import type { CampusLocation } from "@/hooks/useCampusLocations";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedSchool: string;
  onSchoolChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  schools: School[];
  locations: CampusLocation[];
  activeSchoolIds?: Set<string>;
  activeCategories?: Set<string>;
}

const SearchFilters = ({
  searchQuery,
  onSearchChange,
  selectedSchool,
  onSchoolChange,
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  schools,
  locations,
  activeSchoolIds,
  activeCategories,
}: SearchFiltersProps) => {
  const isSchoolActive = (id: string) => !activeSchoolIds || activeSchoolIds.has(id);
  const isCategoryActive = (c: string) => !activeCategories || activeCategories.has(c);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search businesses, products, services..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={selectedSchool} onValueChange={onSchoolChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schools.map((school) => {
              const active = isSchoolActive(school.id);
              return (
                <SelectItem
                  key={school.id}
                  value={school.id}
                  disabled={!active}
                  className={!active ? "opacity-40 cursor-not-allowed" : ""}
                >
                  {school.name}{!active ? " (No vendors yet)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => {
              const active = isCategoryActive(cat);
              return (
                <SelectItem
                  key={cat}
                  value={cat}
                  disabled={!active}
                  className={!active ? "opacity-40 cursor-not-allowed" : ""}
                >
                  {cat}{!active ? " (No vendors yet)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SearchFilters;
