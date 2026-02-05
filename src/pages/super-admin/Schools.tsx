import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, MoreHorizontal } from "lucide-react";

const Schools = () => {
  const schools = [
    { id: 1, name: "Lincoln Academy", plan: "Professional", status: "Active", students: 1234, admin: "John Smith", email: "admin@lincoln.edu" },
    { id: 2, name: "Oak Valley High", plan: "Enterprise", status: "Active", students: 2500, admin: "Jane Doe", email: "admin@oakvalley.edu" },
    { id: 3, name: "Maple Grove School", plan: "Starter", status: "Pending", students: 450, admin: "Mike Johnson", email: "admin@maplegrove.edu" },
    { id: 4, name: "Cedar Heights", plan: "Professional", status: "Active", students: 890, admin: "Sarah Wilson", email: "admin@cedarheights.edu" },
  ];

  return (
    <DashboardLayout userRole="super_admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Schools</h1>
            <p className="text-muted-foreground mt-1">Manage all registered schools</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search schools..." className="pl-10" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Schools ({schools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schools.map((school) => (
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
                      <div className="text-sm text-muted-foreground">{school.admin} • {school.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-medium">{school.students.toLocaleString()} students</div>
                      <div className="text-xs text-muted-foreground">{school.plan} Plan</div>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        school.status === "Active"
                          ? "bg-success/20 text-success"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {school.status}
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

export default Schools;
