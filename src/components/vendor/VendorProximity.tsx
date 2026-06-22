/**
 * VendorProximity.tsx
 * ===================
 * Generic "Find This Vendor" card shown on vendor profile pages.
 * Replaces specific address rendering with a generic campus-based message for privacy.
 *
 * PLACEMENT: src/components/vendor/VendorProximity.tsx
 */

import { MapPin } from "lucide-react";

export default function VendorProximity({ vendor }: { vendor: any }) {
  const campusName = vendor.campus_locations?.name || vendor.campus_location_name;
  const schoolName = vendor.schools?.name || vendor.school_name;

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 flex items-start gap-3">
      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground">
        {campusName || schoolName ? (
          <>Based at <span className="font-semibold text-foreground">{campusName || schoolName}</span>. Message the vendor for the exact pickup spot.</>
        ) : (
          <>Vendor location not provided yet — message them for details.</>
        )}
      </div>
    </div>
  );
}
