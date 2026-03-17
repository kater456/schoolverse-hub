import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchools } from "@/hooks/useSchools";
import { Plus, Loader2, UserCog, Activity, Trash2 } from "lucide-react";

interface SubAdminRow {
  id: string;
  user_id: string;
  role: string;
  assigned_school_id: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  school_name: string | null;
}

const ManageSubAdmins = () => {
  const { session } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SubAdminRow | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedRole, setSelectedRole] = useState("sub_admin");
  const [creating, setCreating] = useState(false);
  const { schools } = useSchools();
  const { toast } = useToast();

  const fetchSubAdmins = async () => {
    setIsLoading(true);
    // Fetch user_roles for sub_admin and admin roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role, assigned_school_id")
      .in("role", ["sub_admin", "admin"] as any[]);

    if (!roles || roles.length === 0) {
      setSubAdmins([]);
      setIsLoading(false);
      return;
    }

    // Fetch profiles and schools separately to avoid FK join issues
    const userIds = roles.map((r) => r.user_id);
    const schoolIds = roles.map((r) => r.assigned_school_id).filter(Boolean) as string[];

    const [profilesRes, schoolsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, first_name, last_name, is_active").in("user_id", userIds),
      schoolIds.length > 0
        ? supabase.from("schools").select("id, name").in("id", schoolIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const schoolMap = new Map((schoolsRes.data || []).map((s: any) => [s.id, s.name]));

    const merged: SubAdminRow[] = roles.map((r) => {
      const profile = profileMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        assigned_school_id: r.assigned_school_id,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        is_active: profile?.is_active !== false,
        school_name: r.assigned_school_id ? schoolMap.get(r.assigned_school_id) || null : null,
      };
    });

    setSubAdmins(merged);
    setIsLoading(false);
  };

  useEffect(() => { fetchSubAdmins(); }, []);

  const viewActivity = async (admin: SubAdminRow) => {
    setSelectedAdmin(admin);
    const { data } = await supabase
      .from("admin_activity_log")
      .select("*")
      .eq("admin_id", admin.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    setActivityLog(data || []);
  };

  const createSubAdmin = async () => {
    if (!email || !selectedSchool) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-sub-admin", {
        body: { action: "create", email, school_id: selectedSchool, role: selectedRole },
      });
      if (error) throw error;
      if (!data.success) {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: data.message });
        setShowCreate(false);
        setEmail("");
        setSelectedSchool("");
        fetchSubAdmins();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create sub-admin", variant: "destructive" });
    }
    setCreating(false);
  };

  const removeRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-sub-admin", {
        body: { action: "remove_role", user_id: userId },
      });
      if (error) throw error;
      toast({ title: "Role removed" });
      fetchSubAdmins();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sub-Admin Management</h1>
            <p className="text-sm text-muted-foreground">Manage admins and sub-admins assigned to campuses</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" /> Add Sub-Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sub-Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input placeholder="subadmin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">User must have an existing account</p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign to School</Label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                    <SelectContent>
                      {schools.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createSubAdmin} disabled={creating} className="w-full">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Sub-Admin
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subAdmins.map((sa) => (
                    <TableRow key={sa.id}>
                      <TableCell className="font-medium">
                        {sa.first_name || "—"} {sa.last_name || ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sa.role === "admin" ? "default" : "secondary"}>
                          {sa.role === "admin" ? "Admin" : "Sub-Admin"}
                        </Badge>
                      </TableCell>
                      <TableCell>{sa.school_name || "All schools"}</TableCell>
                      <TableCell>
                        <Badge variant={sa.is_active ? "default" : "secondary"}>
                          {sa.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => viewActivity(sa)}>
                          <Activity className="h-4 w-4 mr-1" /> Activity
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeRole(sa.user_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subAdmins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sub-admins yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Activity Log Dialog */}
        <Dialog open={!!selectedAdmin} onOpenChange={() => setSelectedAdmin(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Activity: {selectedAdmin?.first_name} {selectedAdmin?.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
              ) : (
                activityLog.map((log) => (
                  <div key={log.id} className="border-b border-border/50 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{log.action}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.target_type && <p className="text-xs text-muted-foreground">Target: {log.target_type}</p>}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ManageSubAdmins;
