import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchools, School } from "@/hooks/useSchools";
import { Building2, Plus, Search, MoreHorizontal, Loader2, X, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Schools = () => {
  const { schools, isLoading, createSchool, updateSchool, deleteSchool, assignSchoolAdmin } = useSchools();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newSchool, setNewSchool] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    subscription_plan: "starter",
  });

  const [adminEmail, setAdminEmail] = useState("");

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSchool = async () => {
    if (!newSchool.name) return;
    setIsSubmitting(true);
    await createSchool(newSchool);
    setIsSubmitting(false);
    setIsCreateOpen(false);
    setNewSchool({ name: "", email: "", phone: "", address: "", subscription_plan: "starter" });
  };

  const handleUpdateSchool = async () => {
    if (!selectedSchool) return;
    setIsSubmitting(true);
    await updateSchool(selectedSchool.id, selectedSchool);
    setIsSubmitting(false);
    setIsEditOpen(false);
    setSelectedSchool(null);
  };

  const handleDeleteSchool = async (id: string) => {
    if (confirm("Are you sure you want to delete this school?")) {
      await deleteSchool(id);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedSchool || !adminEmail) return;
    setIsSubmitting(true);
    // Note: This would need a backend function to find user by email
    // For now, we'll show a placeholder
    setIsSubmitting(false);
    setIsAssignAdminOpen(false);
    setAdminEmail("");
  };

  return (
    <DashboardLayout userRole="super_admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Schools</h1>
            <p className="text-muted-foreground mt-1">Manage all registered schools</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>
                  Create a new school and assign an administrator.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                    placeholder="Lincoln Academy"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSchool.email}
                    onChange={(e) => setNewSchool({ ...newSchool, email: e.target.value })}
                    placeholder="admin@school.edu"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newSchool.phone}
                    onChange={(e) => setNewSchool({ ...newSchool, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                    placeholder="123 School St, City, State"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchool} disabled={isSubmitting || !newSchool.name}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create School"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Schools ({filteredSchools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No schools found</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  Add your first school
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{school.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {school.email || "No email"} • {school.phone || "No phone"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <div className="text-sm font-medium capitalize">{school.subscription_plan} Plan</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(school.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          school.subscription_status === "active"
                            ? "bg-success/20 text-success"
                            : "bg-warning/20 text-warning"
                        }`}
                      >
                        {school.subscription_status}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSchool(school);
                              setIsEditOpen(true);
                            }}
                          >
                            Edit School
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSchool(school);
                              setIsAssignAdminOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteSchool(school.id)}
                          >
                            Delete School
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit School Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit School</DialogTitle>
              <DialogDescription>
                Update school information.
              </DialogDescription>
            </DialogHeader>
            {selectedSchool && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">School Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedSchool.name}
                    onChange={(e) =>
                      setSelectedSchool({ ...selectedSchool, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedSchool.email || ""}
                    onChange={(e) =>
                      setSelectedSchool({ ...selectedSchool, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={selectedSchool.phone || ""}
                    onChange={(e) =>
                      setSelectedSchool({ ...selectedSchool, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={selectedSchool.address || ""}
                    onChange={(e) =>
                      setSelectedSchool({ ...selectedSchool, address: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSchool} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Admin Dialog */}
        <Dialog open={isAssignAdminOpen} onOpenChange={setIsAssignAdminOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign School Administrator</DialogTitle>
              <DialogDescription>
                Enter the email of the user to assign as administrator for {selectedSchool?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@school.edu"
                />
                <p className="text-xs text-muted-foreground">
                  The user must have an existing account.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignAdminOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignAdmin} disabled={isSubmitting || !adminEmail}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  "Assign Admin"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Schools;
