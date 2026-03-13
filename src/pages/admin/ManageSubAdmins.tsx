import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchools } from "@/hooks/useSchools";
import { Plus, Eye, Loader2, UserCog, Activity } from "lucide-react";

const ManageSubAdmins = () => {
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [creating, setCreating] = useState(false);
  const { schools } = useSchools();
  const { toast } = useToast();

  const fetchSubAdmins = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("*, profiles:user_id(first_name, last_name, user_id), schools:assigned_school_id(name)")
      .in("role", ["sub_admin", "admin"] as any[]);
    setSubAdmins(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchSubAdmins(); }, []);

  const viewActivity = async (adminId: string) => {
    const admin = subAdmins.find((a) => a.user_id === adminId);
    setSelectedAdmin(admin);
    const { data } = await supabase
      .from("admin_activity_log")
      .select("*")
      .eq("admin_id", adminId)
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

    // Find user by email via profiles
    const { data: users } = await supabase.auth.admin.listUsers();
    // Since we can't use admin API from client, we look up by profile
    // The sub-admin must already have an account
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .limit(100);

    // We need to find user by email - check auth
    toast({
      title: "Sub-admin creation",
      description: "The user must first create an account. Then you can assign them the sub_admin role by their user ID.",
    });
    setCreating(false);
    setShowCreate(false);
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
                  <Input
                    placeholder="subadmin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">User must have an existing account</p>
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
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subAdmins.map((sa) => (
                    <TableRow key={sa.id}>
                      <TableCell className="font-medium">
                        {(sa.profiles as any)?.first_name || "—"} {(sa.profiles as any)?.last_name || ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sa.role === "admin" ? "default" : "secondary"}>
                          {sa.role === "admin" ? "Admin" : "Sub-Admin"}
                        </Badge>
                      </TableCell>
                      <TableCell>{(sa.schools as any)?.name || "All schools"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewActivity(sa.user_id)}
                        >
                          <Activity className="h-4 w-4 mr-1" /> View Activity
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subAdmins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No sub-admins yet
                      </TableCell>
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
                Activity: {(selectedAdmin?.profiles as any)?.first_name} {(selectedAdmin?.profiles as any)?.last_name}
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.target_type && (
                      <p className="text-xs text-muted-foreground">
                        Target: {log.target_type}
                      </p>
                    )}
                    {log.details && (
                      <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
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
