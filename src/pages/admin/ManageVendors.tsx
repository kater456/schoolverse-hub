import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllVendors } from "@/hooks/useVendors";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Eye, Loader2, Star, FileText, ShieldCheck, Globe,
  AlertTriangle, Ban, CreditCard, Banknote, CircleSlash,
} from "lucide-react";

const POOR_REVIEW_THRESHOLD = 30;

// Payment status badge helper
const PaymentBadge = ({ status }: { status?: string }) => {
  if (!status || status === "unpaid") {
    return <Badge variant="destructive" className="text-xs gap-1"><CircleSlash className="h-3 w-3" />Unpaid</Badge>;
  }
  if (status === "paid") {
    return <Badge className="bg-success/20 text-success text-xs gap-1"><CreditCard className="h-3 w-3" />Paid</Badge>;
  }
  if (status === "overridden") {
    return <Badge className="bg-blue-500/20 text-blue-600 text-xs gap-1"><Banknote className="h-3 w-3" />Overridden</Badge>;
  }
  if (status === "free") {
    return <Badge className="bg-accent/20 text-accent text-xs">Free</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
};

const ManageVendors = () => {
  const { vendors, isLoading, refetch } = useAllVendors();
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_approved: true }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vendor approved ✅" });
      refetch();
      if (selectedVendor?.id === id) setSelectedVendor((v: any) => ({ ...v, is_approved: true }));
    });
  };

  const removeVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_active: false }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vendor removed" });
      refetch();
    });
  };

  const reactivateVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_active: true, is_approved: false }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vendor restored to pending" });
      refetch();
    });
  };

  const toggleVerified = async (id: string, currentStatus: boolean) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_verified: !currentStatus } as any).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: !currentStatus ? "Vendor verified ✅" : "Verification removed" });
      refetch();
      if (selectedVendor?.id === id) setSelectedVendor((v: any) => ({ ...v, is_verified: !currentStatus }));
    });
  };

  // Super admin override: mark payment as overridden without Paystack
  const overridePayment = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase
        .from("vendors")
        .update({ payment_status: "overridden" } as any)
        .eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Payment overridden ✅", description: "Vendor payment marked as manually approved." });
      refetch();
      if (selectedVendor?.id === id) setSelectedVendor((v: any) => ({ ...v, payment_status: "overridden" }));
    });
  };

  const privateDetails = selectedVendor?.vendor_private_details?.[0];
  const activeVendors = vendors.filter((v: any) => v.is_active !== false);
  const rejectedVendors = vendors.filter((v: any) => v.is_active === false);

  const getVendorFlags = (v: any) => {
    const flags: { type: string; label: string; color: string }[] = [];
    const poorReviews = (v.vendor_ratings || []).filter((r: any) => r.rating <= 2).length;
    if (poorReviews >= POOR_REVIEW_THRESHOLD) {
      flags.push({ type: "poor_reviews", label: `${poorReviews} poor reviews`, color: "bg-destructive/20 text-destructive" });
    }
    if (v.is_active === false) {
      flags.push({ type: "inactive", label: "Inactive", color: "bg-orange-500/20 text-orange-600" });
    }
    return flags;
  };

  const isLoaded = (id: string) => actionLoading === id;

  const renderVendorTable = (vendorList: any[], showReactivate = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>School</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>ID Doc</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Flags</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendorList.map((v: any) => {
          const pd = v.vendor_private_details?.[0];
          const flags = getVendorFlags(v);
          const paymentOk = ["paid", "overridden", "free"].includes(v.payment_status);
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
                  <Globe className="h-3 w-3 mr-1" />{v.country || "Nigeria"}
                </Badge>
              </TableCell>
              <TableCell>{v.category}</TableCell>
              <TableCell>{v.schools?.name || "—"}</TableCell>
              <TableCell><PaymentBadge status={v.payment_status} /></TableCell>
              <TableCell>
                {pd?.id_document_url
                  ? <Badge className="bg-success/20 text-success text-xs"><FileText className="h-3 w-3 mr-1" />Uploaded</Badge>
                  : <Badge variant="secondary" className="text-xs">No ID</Badge>}
              </TableCell>
              <TableCell>
                {!v.is_active ? <Badge variant="destructive">Rejected</Badge>
                  : v.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge>
                  : <Badge variant="secondary">Pending</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {flags.map((f, i) => (
                    <Badge key={i} className={`text-[10px] ${f.color}`}>
                      {f.type === "poor_reviews" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                      {f.type === "inactive" && <Ban className="h-3 w-3 mr-0.5" />}
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setSelectedVendor(v)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {showReactivate ? (
                    <Button size="sm" variant="outline" onClick={() => reactivateVendor(v.id)} disabled={isLoaded(v.id)}>
                      {isLoaded(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore"}
                    </Button>
                  ) : (
                    <>
                      {/* Payment override button for unpaid Nigerian vendors */}
                      {(v.country === "Nigeria" || !v.country) && !paymentOk && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                          onClick={() => overridePayment(v.id)}
                          disabled={isLoaded(v.id)}
                          title="Override payment manually"
                        >
                          {isLoaded(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Banknote className="h-3 w-3 mr-1" />Override Pay</>}
                        </Button>
                      )}
                      {!v.is_approved && v.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-success"
                          onClick={() => approveVendor(v.id)}
                          disabled={isLoaded(v.id)}
                          title="Approve vendor"
                        >
                          {isLoaded(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      )}
                      {v.is_active && pd?.id_document_url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-primary"
                          onClick={() => toggleVerified(v.id, !!v.is_verified)}
                          title={v.is_verified ? "Remove verification" : "Grant verified badge"}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {v.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeVendor(v.id)}
                          disabled={isLoaded(v.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {vendorList.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              No vendors in this category
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Manage Vendors</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active & Pending ({activeVendors.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected / Removed ({rejectedVendors.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="border-border/50">
              <CardContent className="p-0 overflow-x-auto">
                {renderVendorTable(activeVendors)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <Ban className="h-4 w-4" /> Rejected / Removed Vendors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {renderVendorTable(rejectedVendors, true)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Vendor Detail Dialog — Super Admin sees EVERYTHING including ID doc */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVendor?.business_name}
              {selectedVendor?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4 text-sm">
              {/* Payment Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground font-medium">Payment Status</span>
                <div className="flex items-center gap-2">
                  <PaymentBadge status={selectedVendor.payment_status} />
                  {(!selectedVendor.payment_status || selectedVendor.payment_status === "unpaid") && selectedVendor.country === "Nigeria" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 text-xs h-7"
                      onClick={() => overridePayment(selectedVendor.id)}
                    >
                      <Banknote className="h-3 w-3 mr-1" /> Override
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick approve button if pending */}
              {!selectedVendor.is_approved && selectedVendor.is_active && (
                <Button
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => approveVendor(selectedVendor.id)}
                >
                  <Check className="h-4 w-4 mr-2" /> Approve This Vendor
                </Button>
              )}

              <div>
                <h4 className="font-semibold mb-2 text-foreground">Public Info</h4>
                <div className="space-y-1 text-muted-foreground">
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
                  <h4 className="font-semibold mb-2 text-destructive">🔒 Private Info (Super Admin Only)</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Full Name:</strong> {privateDetails.full_name}</p>
                    <p><strong>Residence:</strong> {privateDetails.residential_location}</p>
                    <p><strong>Personal Contact:</strong> {privateDetails.personal_contact}</p>
                    {privateDetails.vendor_photo_url && (
                      <img src={privateDetails.vendor_photo_url} alt="Vendor" className="w-24 h-24 rounded-lg object-cover mt-2" />
                    )}
                    {/* ID Document — VISIBLE to Super Admin only */}
                    {privateDetails.id_document_url && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="font-medium text-foreground text-xs mb-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> ID Document
                        </p>
                        <a
                          href={privateDetails.id_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs font-medium"
                        >
                          View ID Document ↗
                        </a>
                        {!selectedVendor.is_verified && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full text-xs h-8 border-primary/30 text-primary"
                            onClick={() => toggleVerified(selectedVendor.id, false)}
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Grant Verified Badge
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedVendor.vendor_images?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 text-foreground">Product Photos</h4>
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
