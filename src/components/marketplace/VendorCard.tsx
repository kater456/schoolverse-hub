import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Star } from "lucide-react";
import type { Vendor } from "@/hooks/useVendors";

interface VendorCardProps {
  vendor: Vendor;
}

const VendorCard = ({ vendor }: VendorCardProps) => {
  const primaryImage = vendor.images?.find((img) => img.is_primary) || vendor.images?.[0];

  return (
    <Link to={`/vendor/${vendor.id}`}>
      <Card className="overflow-hidden hover-lift cursor-pointer group border-border/50">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={vendor.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🏪</span>
            </div>
          )}
          {vendor.is_featured && (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          )}
          <Badge variant="secondary" className="absolute top-2 right-2">
            {vendor.category}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground truncate">{vendor.business_name}</h3>
          {vendor.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{vendor.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            {vendor.school_name && (
              <span className="flex items-center gap-1">
                🎓 {vendor.school_name}
              </span>
            )}
            {vendor.campus_location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {vendor.campus_location_name}
              </span>
            )}
          </div>
          {vendor.contact_number && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {vendor.contact_number}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default VendorCard;
