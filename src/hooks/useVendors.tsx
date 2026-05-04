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

/**
 * Scalable admin vendors hook:
 * - server-side pagination (default 50/page)
 * - server-side search (ilike on business_name / category / contact_number)
 * - status filter (active | rejected | all)
 * - realtime subscription so new/updated vendors appear live
 */
export interface UseAllVendorsOpts {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "rejected" | "all";
}

export const useAllVendors = (opts: UseAllVendorsOpts = {}) => {
  const { page = 0, pageSize = 50, search = "", status = "all" } = opts;
  const [vendors, setVendors] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllVendors = async () => {
    setIsLoading(true);
    let q = supabase
      .from("vendors")
      .select(
        `*, schools(name), campus_locations(name), vendor_images(id, image_url, is_primary), vendor_private_details(*), vendor_ratings(rating), vendor_comments(id)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status === "active") q = q.neq("is_active", false);
    if (status === "rejected") q = q.eq("is_active", false);

    const term = search.trim();
    if (term) {
      const safe = term.replace(/[%,]/g, "");
      q = q.or(
        `business_name.ilike.%${safe}%,category.ilike.%${safe}%,contact_number.ilike.%${safe}%`
      );
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (!error) {
      setVendors(data || []);
      setTotalCount(count || 0);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllVendors();
    // realtime: refetch on any vendors mutation
    const ch = supabase
      .channel("admin-vendors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors" },
        () => fetchAllVendors()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status]);

  return { vendors, totalCount, isLoading, refetch: fetchAllVendors };
};
