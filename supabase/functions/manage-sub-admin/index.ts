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

    // Verify caller is admin/super_admin
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

    // Check caller role
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerRole || !["super_admin", "admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    const body = await req.json();
    const { action, email, school_id, user_id, role } = body;

    if (action === "create") {
      // Find user by email
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(listError.message);

      const targetUser = users?.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, message: "No user found with this email. They must create an account first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }

      // Check if already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .single();

      if (existingRole) {
        // Update existing role
        await supabase
          .from("user_roles")
          .update({ role: role || "sub_admin", assigned_school_id: school_id || null, promotion_notified: false })
          .eq("user_id", targetUser.id);
      } else {
        await supabase
          .from("user_roles")
          .insert({ user_id: targetUser.id, role: role || "sub_admin", assigned_school_id: school_id || null, promotion_notified: false });
      }

      // Log activity
      await supabase.from("admin_activity_log").insert({
        admin_id: caller.id,
        action: `Assigned ${role || "sub_admin"} role`,
        target_type: "user",
        target_id: targetUser.id,
        details: { email, school_id },
      });

      return new Response(JSON.stringify({ success: true, message: "Sub-admin created successfully", userId: targetUser.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_status") {
      // Toggle user active status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_active: body.is_active })
        .eq("user_id", user_id);

      if (updateError) throw new Error(updateError.message);

      await supabase.from("admin_activity_log").insert({
        admin_id: caller.id,
        action: body.is_active ? "Activated user" : "Deactivated user",
        target_type: "user",
        target_id: user_id,
      });

      return new Response(JSON.stringify({ success: true, message: `User ${body.is_active ? "activated" : "deactivated"}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_role") {
      await supabase.from("user_roles").delete().eq("user_id", user_id);

      await supabase.from("admin_activity_log").insert({
        admin_id: caller.id,
        action: "Removed user role",
        target_type: "user",
        target_id: user_id,
      });

      return new Response(JSON.stringify({ success: true, message: "Role removed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
