import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Star, ShieldCheck, Trophy } from "lucide-react";
import type { Vendor } from "@/hooks/useVendors";

interface VendorCardProps {
  vendor: Vendor & {
    is_vendor_of_week?: boolean;
    vendor_of_week_expires_at?: string | null;
  };
}

const VendorCard = ({ vendor }: VendorCardProps) => {
  const primaryImage = vendor.images?.find((img) => img.is_primary) || vendor.images?.[0];

  const isVotw =
    vendor.is_vendor_of_week &&
    vendor.vendor_of_week_expires_at &&
    new Date(vendor.vendor_of_week_expires_at) > new Date();

  return (
    <Link to={`/vendor/${vendor.id}`}>
      <Card className={`overflow-hidden hover-lift cursor-pointer group border-border/50 relative ${
        isVotw ? "ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/10" : ""
      }`}>
        {/* Vendor of the Week glowing top bar */}
        {isVotw && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 z-10" />
        )}

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

          {/* Vendor of the Week badge — top priority, replaces Featured */}
          {isVotw ? (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 border-0 shadow-md font-semibold">
              <Trophy className="h-3 w-3 mr-1 fill-current" />
              Vendor of the Week
            </Badge>
          ) : vendor.is_featured ? (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          ) : null}

          <Badge variant="secondary" className="absolute top-2 right-2">
            {vendor.category}
          </Badge>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-foreground truncate flex-1">{vendor.business_name}</h3>
            {(vendor as any).is_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" title="Verified" />
            )}
          </div>

          {vendor.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{vendor.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            {vendor.school_name && (
              <span className="flex items-center gap-1">🎓 {vendor.school_name}</span>
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
