import { useState } from "react";
import { useSchools } from "@/hooks/useSchools";
import { useCampusLocations } from "@/hooks/useCampusLocations";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const ManageCampusLocations = () => {
  const { schools } = useSchools();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } = useCampusLocations(selectedSchool || undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [name, setName] = useState("");
  const [schoolForNew, setSchoolForNew] = useState("");

  const openCreate = () => {
    setEditingLocation(null);
    setName("");
    setSchoolForNew(selectedSchool || "");
    setDialogOpen(true);
  };

  const openEdit = (loc: any) => {
    setEditingLocation(loc);
    setName(loc.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingLocation) {
      await updateLocation(editingLocation.id, name);
    } else if (schoolForNew) {
      await createLocation(schoolForNew, name);
    }
    setDialogOpen(false);
  };

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name || "—";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campus Locations</h1>
        <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" /> Add Location
        </Button>
      </div>

      <div className="mb-4">
        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by school" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{schoolName(loc.school_id)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(loc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteLocation(loc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {locations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No locations yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingLocation && (
              <div>
                <Label>School</Label>
                <Select value={schoolForNew} onValueChange={setSchoolForNew}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Location Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Library Area" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ManageCampusLocations;
