import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllVendors } from "@/hooks/useVendors";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, Loader2, Star } from "lucide-react";

const ManageVendors = () => {
  const { vendors, isLoading, refetch } = useAllVendors();
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const approveVendor = async (id: string) => {
    const { error } = await supabase.from("vendors").update({ is_approved: true }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendor approved" });
      refetch();
    }
  };

  const removeVendor = async (id: string) => {
    const { error } = await supabase.from("vendors").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendor removed" });
      refetch();
    }
  };

  const privateDetails = selectedVendor?.vendor_private_details?.[0];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Manage Vendors</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.business_name}</TableCell>
                    <TableCell>{v.category}</TableCell>
                    <TableCell>{v.schools?.name || "—"}</TableCell>
                    <TableCell>
                      {!v.is_active ? (
                        <Badge variant="destructive">Removed</Badge>
                      ) : v.is_approved ? (
                        <Badge className="bg-success text-success-foreground">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setSelectedVendor(v)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!v.is_approved && v.is_active && (
                        <Button size="icon" variant="ghost" className="text-success" onClick={() => approveVendor(v.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {v.is_active && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeVendor(v.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedVendor?.business_name}</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Public Info</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Category:</strong> {selectedVendor.category}</p>
                  <p><strong>Description:</strong> {selectedVendor.description || "—"}</p>
                  <p><strong>Contact:</strong> {selectedVendor.contact_number}</p>
                  <p><strong>School:</strong> {selectedVendor.schools?.name}</p>
                  <p><strong>Location:</strong> {selectedVendor.campus_locations?.name || "—"}</p>
                </div>
              </div>

              {privateDetails && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-1 text-destructive">🔒 Private Info (Admin Only)</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Full Name:</strong> {privateDetails.full_name}</p>
                    <p><strong>Residence:</strong> {privateDetails.residential_location}</p>
                    <p><strong>Personal Contact:</strong> {privateDetails.personal_contact}</p>
                    {privateDetails.vendor_photo_url && (
                      <img src={privateDetails.vendor_photo_url} alt="Vendor" className="w-24 h-24 rounded-lg object-cover mt-2" />
                    )}
                  </div>
                </div>
              )}

              {/* Product Images */}
              {selectedVendor.vendor_images?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2">Product Photos</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedVendor.vendor_images.map((img: any) => (
                      <img key={img.id} src={img.image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ManageVendors;
