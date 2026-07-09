import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify Admin Role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin or super_admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Query storage objects
    // We use the service role to access the storage schema
    const { data: objects, error: storageError } = await supabase
      .schema("storage")
      .from("objects")
      .select("name, metadata")
      .eq("bucket_id", "vendor-media");

    if (storageError) {
      throw storageError;
    }

    // 3. Process and group usage by vendor
    const usageMap: Record<string, { size: number; count: number }> = {};
    let totalSize = 0;

    objects.forEach((obj: any) => {
      const size = obj.metadata?.size || 0;
      totalSize += size;

      const firstSegment = obj.name.split("/")[0];
      if (firstSegment) {
        if (!usageMap[firstSegment]) {
          usageMap[firstSegment] = { size: 0, count: 0 };
        }
        usageMap[firstSegment].size += size;
        usageMap[firstSegment].count += 1;
      }
    });

    // 4. Fetch vendor info to map IDs to names/emails
    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("id, business_name, user_id, profiles(email)");

    if (vendorsError) {
      throw vendorsError;
    }

    const totalUsedMb = totalSize / (1024 * 1024);
    const totalLimitMb = 1024; // As specified in requirements

    // Map vendor results
    const vendorResults = vendors.map((v: any) => {
      // The first segment could be either vendor.id or vendor.user_id
      const statsFromId = usageMap[v.id] || { size: 0, count: 0 };
      const statsFromUserId = usageMap[v.user_id] || { size: 0, count: 0 };

      const totalVendorSize = statsFromId.size + (v.id !== v.user_id ? statsFromUserId.size : 0);
      const totalVendorCount = statsFromId.count + (v.id !== v.user_id ? statsFromUserId.count : 0);

      return {
        vendor_id: v.id,
        vendor_name: v.business_name,
        vendor_email: v.profiles?.email,
        storage_mb: parseFloat((totalVendorSize / (1024 * 1024)).toFixed(2)),
        image_count: totalVendorCount,
      };
    })
    .filter(v => v.image_count > 0)
    .sort((a, b) => b.storage_mb - a.storage_mb);

    const result = {
      total_used_mb: parseFloat(totalUsedMb.toFixed(2)),
      total_limit_mb: totalLimitMb,
      percent_used: parseFloat(((totalUsedMb / totalLimitMb) * 100).toFixed(1)),
      vendors: vendorResults,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
