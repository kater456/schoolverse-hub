import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Eye, Loader2, ShieldCheck, Globe, Ban,
  CreditCard, Banknote, CircleSlash, Film, Users,
} from "lucide-react";

// Payment badge — same logic as super admin
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

const ManageVendorsSubAdmin = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getAssignedSchoolId = () =>
    (userRole as any)?.assigned_school_id || (userRole as any)?.school_id;

  const fetchVendors = async () => {
    setIsLoading(true);
    const schoolId = getAssignedSchoolId();

    let query = supabase.from("vendors").select(`
      id, business_name, category, description, contact_number,
      country, is_approved, is_active, is_verified, reels_enabled,
      payment_status, payment_reference, created_at,
      schools(name),
      campus_locations(name),
      vendor_private_details(
        full_name,
        vendor_photo_url,
        residential_location,
        personal_contact
      ),
      vendor_images(image_url, is_primary, display_order)
    `);

    if (schoolId) {
      query = query.eq("school_id", schoolId) as any;
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading vendors", description: error.message, variant: "destructive" });
    } else {
      setVendors(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && userRole) fetchVendors();
  }, [user, userRole]);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_approved: true }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id, action: "Approved vendor", target_type: "vendor", target_id: id,
      } as any);
      toast({ title: "Vendor approved ✅" });
      setVendors((prev) => prev.map((v) => v.id === id ? { ...v, is_approved: true } : v));
      if (selectedVendor?.id === id) setSelectedVendor((v: any) => ({ ...v, is_approved: true }));
    });
  };

  const deactivateVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_active: false }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id, action: "Deactivated vendor", target_type: "vendor", target_id: id,
      } as any);
      toast({ title: "Vendor deactivated" });
      setVendors((prev) => prev.map((v) => v.id === id ? { ...v, is_active: false } : v));
    });
  };

  const reactivateVendor = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ is_active: true, is_approved: false }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vendor restored to pending" });
      setVendors((prev) => prev.map((v) => v.id === id ? { ...v, is_active: true, is_approved: false } : v));
    });
  };

  // Sub-admin can override payment (but cannot see ID doc)
  const overridePayment = async (id: string) => {
    runAction(id, async () => {
      const { error } = await supabase
        .from("vendors")
        .update({ payment_status: "overridden" } as any)
        .eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id, action: "Overrode payment", target_type: "vendor", target_id: id,
      } as any);
      toast({ title: "Payment overridden ✅", description: "Vendor payment marked as manually approved." });
      setVendors((prev) => prev.map((v) => v.id === id ? { ...v, payment_status: "overridden" } : v));
      if (selectedVendor?.id === id) setSelectedVendor((v: any) => ({ ...v, payment_status: "overridden" }));
    });
  };

  const toggleReels = async (id: string, current: boolean) => {
    runAction(id, async () => {
      const { error } = await supabase.from("vendors").update({ reels_enabled: !current }).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id,
        action: current ? "Revoked Reels access" : "Granted Reels access",
        target_type: "vendor", target_id: id,
      } as any);
      toast({ title: current ? "Reels revoked" : "Reels granted ✅" });
      setVendors((prev) => prev.map((v) => v.id === id ? { ...v, reels_enabled: !current } : v));
    });
  };

  const activeVendors = vendors.filter((v) => v.is_active !== false);
  const pendingVendors = activeVendors.filter((v) => !v.is_approved);
  const approvedVendors = activeVendors.filter((v) => v.is_approved);
  const removedVendors = vendors.filter((v) => v.is_active === false);

  const isLoaded = (id: string) => actionLoading === id;

  const renderTable = (list: any[], showReactivate = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>School</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((v) => {
          const paymentOk = ["paid", "overridden", "free"].includes(v.payment_status);
          return (
            <TableRow key={v.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {v.business_name}
                  {v.is_verified && <ShieldCheck className="h-4 w-4 text-primary" title="Verified" />}
                  {v.reels_enabled && <Film className="h-4 w-4 text-accent" title="Reels enabled" />}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />{v.country || "Nigeria"}
                </Badge>
              </TableCell>
              <TableCell>{v.category}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{v.schools?.name || "—"}</TableCell>
              <TableCell><PaymentBadge status={v.payment_status} /></TableCell>
              <TableCell>
                {!v.is_active
                  ? <Badge variant="destructive">Removed</Badge>
                  : v.is_approved
                  ? <Badge className="bg-success text-success-foreground">Approved</Badge>
                  : <Badge variant="secondary">Pending</Badge>}
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
                      {/* Payment override for unpaid Nigerian vendors */}
                      {(v.country === "Nigeria" || !v.country) && !paymentOk && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs h-8"
                          onClick={() => overridePayment(v.id)}
                          disabled={isLoaded(v.id)}
                          title="Override payment manually"
                        >
                          {isLoaded(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Banknote className="h-3 w-3 mr-1" />Override</>}
                        </Button>
                      )}
                      {!v.is_approved && v.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-success"
                          onClick={() => approveVendor(v.id)}
                          disabled={isLoaded(v.id)}
                          title="Approve"
                        >
                          {isLoaded(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      )}
                      {v.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deactivateVendor(v.id)}
                          disabled={isLoaded(v.id)}
                          title="Remove"
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
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No vendors here
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingVendors.length > 0 && (
              <span className="ml-1.5 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                {pendingVendors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedVendors.length})</TabsTrigger>
          <TabsTrigger value="removed">Removed ({removedVendors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-warning">
                <Users className="h-4 w-4" /> Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {renderTable(pendingVendors)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              {renderTable(approvedVendors)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="removed">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <Ban className="h-4 w-4" /> Removed Vendors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {renderTable(removedVendors, true)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Detail Dialog — NO ID Document for sub-admin */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVendor?.business_name}
              {selectedVendor?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </DialogTitle>
          </DialogHeader>
          {selectedVendor && (() => {
            const pd = selectedVendor.vendor_private_details?.[0];
            const paymentOk = ["paid", "overridden", "free"].includes(selectedVendor.payment_status);
            return (
              <div className="space-y-4 text-sm">

                {/* Payment Status Banner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground font-medium">Payment Status</span>
                  <div className="flex items-center gap-2">
                    <PaymentBadge status={selectedVendor.payment_status} />
                    {!paymentOk && selectedVendor.country === "Nigeria" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 text-xs h-7"
                        onClick={() => overridePayment(selectedVendor.id)}
                        disabled={!!actionLoading}
                      >
                        <Banknote className="h-3 w-3 mr-1" /> Override
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2">
                  {!selectedVendor.is_approved && selectedVendor.is_active && (
                    <Button
                      className="flex-1 bg-success text-success-foreground hover:bg-success/90 h-9 text-sm"
                      onClick={() => approveVendor(selectedVendor.id)}
                      disabled={!!actionLoading}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  )}
                  {selectedVendor.is_active && (
                    <Button
                      variant="destructive"
                      className="flex-1 h-9 text-sm"
                      onClick={() => { deactivateVendor(selectedVendor.id); setSelectedVendor(null); }}
                      disabled={!!actionLoading}
                    >
                      <X className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  )}
                  {selectedVendor.is_approved && (
                    <Button
                      variant={selectedVendor.reels_enabled ? "destructive" : "outline"}
                      className="flex-1 h-9 text-sm"
                      onClick={() => toggleReels(selectedVendor.id, selectedVendor.reels_enabled)}
                      disabled={!!actionLoading}
                    >
                      <Film className="h-4 w-4 mr-2" />
                      {selectedVendor.reels_enabled ? "Revoke Reels" : "Grant Reels"}
                    </Button>
                  )}
                </div>

                {/* Public info */}
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Business Info</h4>
                  <div className="space-y-1 text-muted-foreground bg-muted/30 rounded-lg p-3">
                    <p><strong>Country:</strong> {selectedVendor.country || "Nigeria"}</p>
                    <p><strong>Category:</strong> {selectedVendor.category}</p>
                    <p><strong>Description:</strong> {selectedVendor.description || "—"}</p>
                    <p><strong>Contact:</strong> {selectedVendor.contact_number}</p>
                    <p><strong>School:</strong> {selectedVendor.schools?.name || "—"}</p>
                    <p><strong>Campus Location:</strong> {selectedVendor.campus_locations?.name || "—"}</p>
                    <p><strong>Verified:</strong> {selectedVendor.is_verified ? "✅ Yes" : "❌ No"}</p>
                  </div>
                </div>

                {/* Private info — NO id_document_url */}
                {pd && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 text-destructive">🔒 Private Info (Admin Only)</h4>
                    <div className="space-y-2 text-muted-foreground bg-destructive/5 rounded-lg p-3">
                      <p><strong>Full Name:</strong> {pd.full_name}</p>
                      <p><strong>Residence:</strong> {pd.residential_location}</p>
                      <p><strong>Personal Contact:</strong> {pd.personal_contact}</p>
                      {pd.vendor_photo_url && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Vendor Photo</p>
                          <img src={pd.vendor_photo_url} alt="Vendor" className="w-20 h-20 rounded-lg object-cover" />
                        </div>
                      )}
                      {/* ID Document intentionally hidden from sub-admin */}
                      <p className="text-xs text-muted-foreground italic mt-2">
                        🔐 ID document viewable by Super Admin only
                      </p>
                    </div>
                  </div>
                )}

                {/* Product photos */}
                {selectedVendor.vendor_images?.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 text-foreground">Product Photos</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedVendor.vendor_images.map((img: any, i: number) => (
                        <img key={i} src={img.image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageVendorsSubAdmin;
