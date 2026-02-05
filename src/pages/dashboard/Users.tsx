import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Plus, Search, MoreHorizontal } from "lucide-react";

const Users = () => {
  const users = [
    { id: 1, name: "Emma Wilson", email: "emma@school.edu", role: "Student", grade: "10th", status: "Active" },
    { id: 2, name: "James Brown", email: "james@school.edu", role: "Student", grade: "11th", status: "Active" },
    { id: 3, name: "Sophie Davis", email: "sophie@school.edu", role: "Teacher", grade: "-", status: "Active" },
    { id: 4, name: "Michael Lee", email: "michael@school.edu", role: "Student", grade: "9th", status: "Inactive" },
  ];

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">Manage students, teachers, and staff</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-10" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="font-medium">{user.role}</div>
                      <div className="text-xs text-muted-foreground">{user.grade !== "-" ? `Grade ${user.grade}` : "Staff"}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === "Active"
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Users;
