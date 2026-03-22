import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  description: string | null;
  contact_number: string | null;
  messaging_enabled: boolean;
  school_id: string;
  campus_location_id: string | null;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  school_name?: string;
  campus_location_name?: string;
  images?: { id: string; image_url: string; is_primary: boolean }[];
  is_featured?: boolean;
}

interface UseVendorsOptions {
  schoolId?: string;
  category?: string;
  campusLocationId?: string;
  searchQuery?: string;
  featured?: boolean;
}

export const useVendors = (options?: UseVendorsOptions) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVendors = async () => {
    setIsLoading(true);

    let query = supabase
      .from("vendors")
      .select(`
        *,
        schools!inner(name),
        campus_locations(name),
        vendor_images(id, image_url, is_primary)
      `)
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (options?.schoolId) query = query.eq("school_id", options.schoolId);
    if (options?.category) query = query.eq("category", options.category);
    if (options?.campusLocationId) query = query.eq("campus_location_id", options.campusLocationId);
    if (options?.searchQuery) {
      query = query.or(`business_name.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%,category.ilike.%${options.searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const vendorsWithFeatured = await Promise.all(
        data.map(async (v: any) => {
          const { data: featuredData } = await supabase.rpc("is_vendor_featured", { _vendor_id: v.id });
          return {
            ...v,
            school_name: v.schools?.name,
            campus_location_name: v.campus_locations?.name,
            images: v.vendor_images || [],
            is_featured: featuredData || false,
          };
        })
      );

      vendorsWithFeatured.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      });

      setVendors(vendorsWithFeatured);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, [options?.schoolId, options?.category, options?.campusLocationId, options?.searchQuery]);

  return { vendors, isLoading, refetch: fetchVendors };
};

export const useAllVendors = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllVendors = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select(`
        *,
        schools(name),
        campus_locations(name),
        vendor_images(id, image_url, is_primary),
        vendor_private_details(*),
        vendor_ratings(rating),
        vendor_comments(id)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVendors(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllVendors();
  }, []);

  return { vendors, isLoading, refetch: fetchAllVendors };
};
