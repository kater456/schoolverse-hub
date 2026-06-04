import { useState, useMemo } from "react";
import { useSchools } from "@/hooks/useSchools";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search, ImageIcon, GraduationCap } from "lucide-react";
import SchoolBrandingPanel from "@/components/admin/SchoolBrandingPanel";

const ManageSchools = () => {
  const { schools, isLoading, createSchool, deleteSchool, fetchSchools } = useSchools();
  const [createOpen, setCreateOpen] = useState(false);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.subdomain || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  }, [schools, query]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSchool({ name: name.trim() });
    setName("");
    setCreateOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Schools</h1>
            <p className="text-sm text-muted-foreground">Manage every campus on the platform — branding, logos, contact details.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Add school
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, subdomain, address…"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="py-16 text-center space-y-3">
              <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{query ? "No schools match your search." : "No schools yet."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <Card key={s.id} className="border-border/50 hover:border-accent/50 transition-colors group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-full border border-border bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={`${s.name} logo`} className="h-full w-full object-contain" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                      {s.subdomain && <p className="text-[11px] text-muted-foreground truncate">{s.subdomain}.campusmarket</p>}
                      <div className="flex gap-1 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] h-5">{s.subscription_plan}</Badge>
                        <Badge
                          variant={s.subscription_status === "active" ? "default" : "outline"}
                          className="text-[10px] h-5"
                        >
                          {s.subscription_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {s.address && <p className="text-xs text-muted-foreground line-clamp-1">{s.address}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setBrandingId(s.id)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete ${s.name}? This cannot be undone.`)) deleteSchool(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add school</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>School name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. University of Lagos" autoFocus />
            <p className="text-xs text-muted-foreground">You can add a logo, colors and contact info after creating.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branding dialog */}
      <Dialog open={!!brandingId} onOpenChange={(o) => !o && setBrandingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit school</DialogTitle>
          </DialogHeader>
          {brandingId && (
            <SchoolBrandingPanel
              schoolId={brandingId}
              onSaved={fetchSchools}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ManageSchools;
