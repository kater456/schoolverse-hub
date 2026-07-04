import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ success: false, message: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    // Look up the caller's vendors row
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (vendorError || !vendor) {
      return new Response(JSON.stringify({ success: false, message: "Vendor account not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    // Delete the vendors row (related tables cascade confirmed)
    const { error: deleteVendorError } = await supabase
      .from("vendors")
      .delete()
      .eq("user_id", caller.id);

    if (deleteVendorError) throw deleteVendorError;

    // Delete user roles
    const { error: deleteRolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", caller.id);

    if (deleteRolesError) throw deleteRolesError;

    // Delete the auth user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(caller.id);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ success: true, message: "Account deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
