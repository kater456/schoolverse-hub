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
import { Check, X, Eye, Loader2, Star, FileText, ShieldCheck, Globe } from "lucide-react";

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

  const toggleVerified = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("vendors").update({ is_verified: !currentStatus } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !currentStatus ? "Vendor verified" : "Verification removed" });
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
                  <TableHead>Country</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>ID Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v: any) => {
                  const pd = v.vendor_private_details?.[0];
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {v.business_name}
                          {v.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          {v.country || "Nigeria"}
                        </Badge>
                      </TableCell>
                      <TableCell>{v.category}</TableCell>
                      <TableCell>{v.schools?.name || "—"}</TableCell>
                      <TableCell>
                        {pd?.id_document_url ? (
                          <Badge className="bg-success/20 text-success text-xs"><FileText className="h-3 w-3 mr-1" />ID Uploaded</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No ID</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!v.is_active ? <Badge variant="destructive">Removed</Badge>
                          : v.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge>
                          : <Badge variant="secondary">Pending</Badge>}
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
                        {v.is_active && pd?.id_document_url && (
                          <Button size="icon" variant="ghost" className="text-primary" onClick={() => toggleVerified(v.id, !!v.is_verified)}
                            title={v.is_verified ? "Remove verification" : "Grant verified badge"}>
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {v.is_active && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeVendor(v.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {vendors.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vendors yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedVendor?.business_name}</DialogTitle></DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Public Info</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Country:</strong> {selectedVendor.country || "Nigeria"}</p>
                  <p><strong>Category:</strong> {selectedVendor.category}</p>
                  <p><strong>Description:</strong> {selectedVendor.description || "—"}</p>
                  <p><strong>Contact:</strong> {selectedVendor.contact_number}</p>
                  <p><strong>School:</strong> {selectedVendor.schools?.name}</p>
                  <p><strong>Location:</strong> {selectedVendor.campus_locations?.name || "—"}</p>
                  <p><strong>Verified:</strong> {selectedVendor.is_verified ? "✅ Yes" : "❌ No"}</p>
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
                    {privateDetails.id_document_url && (
                      <div className="mt-2">
                        <p className="font-medium text-foreground text-xs mb-1">📄 ID Document:</p>
                        <a href={privateDetails.id_document_url} target="_blank" rel="noopener noreferrer"
                          className="text-primary underline text-xs">View ID Document</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
