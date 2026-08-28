import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeSafe } from "@/lib/safeStorage";

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
  updated_at?: string;
  school_name?: string;
  campus_location_name?: string;
  images?: { id: string; image_url: string; is_primary: boolean }[];
  is_featured?: boolean;
  is_store_upgraded?: boolean;
  store_upgrade_expires_at?: string | null;
}

interface UseVendorsOptions {
  schoolId?: string;
  category?: string;
  campusLocationId?: string;
  searchQuery?: string;
  /** How many regular vendors to load per page (default 12). */
  pageSize?: number;
}

/**
 * Only the columns the marketplace card actually renders — keeps the payload
 * (and therefore the time-to-first-card) small. Note: no assumption is made
 * about the shape of `category`, so a future `store_category` column can be
 * added here without touching any of the query logic below.
 */
const CARD_FIELDS = `
  id, user_id, business_name, category, description, contact_number,
  messaging_enabled, school_id, campus_location_id, created_at,
  is_verified, is_vendor_of_week, vendor_of_week_expires_at, promoted_until,
  reels_enabled, profile_image_url, is_store_upgraded, store_upgrade_expires_at,
  social_instagram, social_tiktok, social_twitter,
  schools!inner(name),
  campus_locations(name),
  vendor_images(id, image_url, is_primary)
`;

const shape = (v: any) => ({
  ...v,
  school_name:          v.schools?.name,
  campus_location_name: v.campus_locations?.name,
  images:               v.vendor_images || [],
});

export const withFeatured = async (rows: any[]) => {
  if (!rows || rows.length === 0) return [];
  const ids = rows.map((v: any) => v.id).filter(Boolean);
  if (ids.length === 0) return rows.map((v: any) => ({ ...v, is_featured: false }));

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("featured_listings")
    .select("vendor_id")
    .in("vendor_id", ids)
    .eq("payment_status", "confirmed")
    .gt("ends_at", now);

  const featuredSet = new Set((data || []).map((item: any) => item.vendor_id));
  return rows.map((v: any) => ({
    ...v,
    is_featured: featuredSet.has(v.id),
  }));
};

export const useVendors = (options?: UseVendorsOptions) => {
  const pageSize = options?.pageSize ?? 12;

  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [stores, setStores]       = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);

  // Cache holding the already-prefetched next page.
  const prefetched = useRef<{ key: string; page: number; rows: Vendor[] } | null>(null);
  const nextPage   = useRef(0);
  const reqKey     = useRef("");

  const filterKey = [
    options?.schoolId, options?.category, options?.campusLocationId, options?.searchQuery,
  ].join("|");

  const baseQuery = useCallback(() => {
    let q = (supabase as any)
      .from("vendors")
      .select(CARD_FIELDS)
      .eq("is_approved", true)
      .eq("is_active", true);

    if (options?.schoolId)         q = q.eq("school_id", options.schoolId);
    if (options?.category)         q = q.eq("category", options.category);
    if (options?.campusLocationId) q = q.eq("campus_location_id", options.campusLocationId);
    if (options?.searchQuery) {
      const safe = options.searchQuery.replace(/[%,]/g, "");
      q = q.or(
        `business_name.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`
      );
    }
    return q;
  }, [options?.schoolId, options?.category, options?.campusLocationId, options?.searchQuery]);

  /** Fetch one page of regular (non-store) vendors. */
  const fetchPage = useCallback(async (page: number): Promise<Vendor[]> => {
    const now  = new Date().toISOString();
    const from = page * pageSize;

    const { data, error } = await baseQuery()
      .or(`is_store_upgraded.is.null,is_store_upgraded.eq.false,store_upgrade_expires_at.lt.${now}`)
      .order("is_vendor_of_week", { ascending: false })
      .order("is_verified",       { ascending: false })
      .order("created_at",        { ascending: false })
      .range(from, from + pageSize - 1);

    if (error || !data) return [];
    return (await withFeatured(data.map(shape))) as Vendor[];
  }, [baseQuery, pageSize]);

  /** Warm the cache for the page after the one just rendered. */
  const prefetch = useCallback(async (page: number, key: string) => {
    const rows = await fetchPage(page);
    if (reqKey.current === key) prefetched.current = { key, page, rows };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const key  = reqKey.current;
    const page = nextPage.current;
    setIsLoadingMore(true);

    const cached = prefetched.current;
    const rows =
      cached && cached.key === key && cached.page === page
        ? cached.rows
        : await fetchPage(page);

    if (reqKey.current !== key) { setIsLoadingMore(false); return; }

    prefetched.current = null;
    setVendors((prev) => {
      const seen = new Set(prev.map((v) => v.id));
      return [...prev, ...rows.filter((v) => !seen.has(v.id))];
    });
    setHasMore(rows.length === pageSize);
    nextPage.current = page + 1;
    setIsLoadingMore(false);

    if (rows.length === pageSize) prefetch(page + 1, key);
  }, [fetchPage, hasMore, isLoadingMore, pageSize, prefetch]);

  const load = useCallback(async () => {
    const key = `${filterKey}:${Date.now()}`;
    reqKey.current   = key;
    prefetched.current = null;
    nextPage.current = 1;
    setIsLoading(true);
    setHasMore(true);

    const now = new Date().toISOString();

    const [first, storeRes] = await Promise.all([
      fetchPage(0),
      // Upgraded stores are a small set — load them all, unpaginated.
      baseQuery()
        .eq("is_store_upgraded", true)
        .or(`store_upgrade_expires_at.is.null,store_upgrade_expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (reqKey.current !== key) return;

    setVendors(first);
    setStores(((storeRes as any)?.data || []).map(shape));
    setHasMore(first.length === pageSize);
    setIsLoading(false);

    if (first.length === pageSize) prefetch(1, key);
  }, [baseQuery, fetchPage, filterKey, pageSize, prefetch]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return { vendors, stores, isLoading, isLoadingMore, hasMore, loadMore, refetch: load };
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

    if (status === "active") q = q.eq("is_active", true);
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
    const ch = isRealtimeSafe()
      ? supabase
          .channel("admin-vendors-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "vendors" },
            () => fetchAllVendors()
          )
          .subscribe()
      : null;
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status]);

  return { vendors, totalCount, isLoading, refetch: fetchAllVendors };
};
