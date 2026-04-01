import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllVendors } from "@/hooks/useVendors";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check, X, Loader2, FileText, ShieldCheck, Globe, Ban,
  CreditCard, Banknote, CircleSlash, MoreVertical, ShieldOff, Megaphone,
  UserX, UserCheck, Star, ExternalLink,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PaymentBadge = ({ status }: { status?: string }) => {
  if (!status || status === "unpaid")
    return <Badge variant="destructive" className="text-xs gap-1"><CircleSlash className="h-3 w-3" />Unpaid</Badge>;
  if (status === "paid")
    return <Badge className="bg-success/20 text-success text-xs gap-1"><CreditCard className="h-3 w-3" />Paid</Badge>;
  if (status === "overridden")
    return <Badge className="bg-blue-500/20 text-blue-600 text-xs gap-1"><Banknote className="h-3 w-3" />Overridden</Badge>;
  if (status === "free")
    return <Badge className="bg-accent/20 text-accent text-xs">Free</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
};

const StatusBadge = ({ v }: { v: any }) => {
  if (v.is_suspended) return <Badge className="bg-orange-500/20 text-orange-600 text-xs">Suspended</Badge>;
  if (!v.is_active)   return <Badge variant="destructive" className="text-xs">Removed</Badge>;
  if (v.is_approved)  return <Badge className="bg-success/20 text-success text-xs">Approved</Badge>;
  return <Badge variant="secondary" className="text-xs">Pending</Badge>;
};

const isPromoted = (v: any) => v?.promoted_until && new Date(v.promoted_until) > new Date();

// ── Component ─────────────────────────────────────────────────────────────────

const ManageVendors = () => {
  const { vendors, isLoading, refetch } = useAllVendors();
  const { toast } = useToast();

  const [detailVendor,   setDetailVendor]   = useState<any>(null);
  const [promoteVendor,  setPromoteVendor]  = useState<any>(null);
  const [promoteDays,    setPromoteDays]    = useState("");
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);

  // Core patch helper
  const patch = async (id: string, payload: any, successMsg: string) => {
    const { error } = await supabase.from("vendors").update(payload as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    toast({ title: successMsg });
    refetch();
    // Optimistically update the open detail panel
    setDetailVendor((prev: any) => prev?.id === id ? { ...prev, ...payload } : prev);
    return true;
  };

  const run = async (id: string, fn: () => Promise<any>) => {
    setActionLoading(id);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor    = (id: string) => run(id, () => patch(id, { is_approved: true }, "Vendor approved ✅"));
  const removeVendor     = (id: string) => run(id, () => patch(id, { is_active: false  }, "Vendor removed"));
  const reactivateVendor = (id: string) => run(id, () => patch(id, { is_active: true, is_approved: false, is_suspended: false }, "Vendor restored to pending"));
  const overridePayment  = (id: string) => run(id, () => patch(id, { payment_status: "overridden" }, "Payment overridden ✅"));
  const removePromotion  = (id: string) => run(id, () => patch(id, { promoted_until: null }, "Promotion removed"));

  const toggleSuspend = (v: any) => run(v.id, () =>
    patch(v.id,
      { is_suspended: !v.is_suspended, is_approved: v.is_suspended ? v.is_approved : false },
      v.is_suspended ? "Vendor unsuspended ✅" : "Vendor suspended"
    )
  );

  const toggleVerify = (v: any) => run(v.id, () =>
    patch(v.id, { is_verified: !v.is_verified }, v.is_verified ? "Verification removed" : "Vendor verified ✅")
  );

  const handlePromote = async () => {
    if (!promoteVendor || !promoteDays || isNaN(Number(promoteDays)) || Number(promoteDays) < 1) return;
    setPromoteLoading(true);
    const days = Number(promoteDays);
    const promoted_until = new Date(Date.now() + days * 86_400_000).toISOString();
    await patch(promoteVendor.id, { promoted_until }, `Promoted for ${days} day${days !== 1 ? "s" : ""} 🚀`);
    setPromoteVendor(null);
    setPromoteDays("");
    setPromoteLoading(false);
  };

  const activeVendors   = vendors.filter((v: any) => v.is_active !== false);
  const rejectedVendors = vendors.filter((v: any) => v.is_active === false);

  // ── Table renderer ──────────────────────────────────────────────────────────
  const renderTable = (list: any[], showReactivate = false) => (
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
          <TableHead>Promo</TableHead>
          <TableHead className="w-[52px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((v: any) => {
          const pd = v.vendor_private_details?.[0];
          const paymentOk = ["paid", "overridden", "free"].includes(v.payment_status);
          const promoted  = isPromoted(v);

          return (
            <TableRow key={v.id} className={v.is_suspended ? "opacity-60" : ""}>

              {/* Clickable business name */}
              <TableCell>
                <button
                  onClick={() => setDetailVendor(v)}
                  className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary hover:underline text-left transition-colors group"
                >
                  <span className="group-hover:underline">{v.business_name}</span>
                  {v.is_verified  && <ShieldCheck className="h-3.5 w-3.5 text-primary  shrink-0" />}
                  {promoted       && <Star        className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                  {v.is_suspended && <Ban         className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                </button>
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="text-xs gap-1">
                  <Globe className="h-3 w-3" />{v.country || "Nigeria"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{v.category}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{v.schools?.name || "—"}</TableCell>
              <TableCell><PaymentBadge status={v.payment_status} /></TableCell>
              <TableCell>
                {pd?.id_document_url
                  ? <Badge className="bg-success/20 text-success text-xs gap-1"><FileText className="h-3 w-3" />Uploaded</Badge>
                  : <Badge variant="secondary" className="text-xs">No ID</Badge>}
              </TableCell>
              <TableCell><StatusBadge v={v} /></TableCell>
              <TableCell>
                {promoted
                  ? <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">
                      Until {new Date(v.promoted_until).toLocaleDateString()}
                    </Badge>
                  : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>

              {/* 3-dot menu */}
              <TableCell>
                {showReactivate ? (
                  <Button size="sm" variant="outline" onClick={() => reactivateVendor(v.id)}
                    disabled={actionLoading === v.id}>
                    {actionLoading === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore"}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">

                      <DropdownMenuItem onClick={() => setDetailVendor(v)}>
                        <FileText className="h-4 w-4 mr-2" /> View Full Details
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {!v.is_approved && v.is_active && !v.is_suspended && (
                        <DropdownMenuItem onClick={() => approveVendor(v.id)} className="text-success focus:text-success">
                          <Check className="h-4 w-4 mr-2" /> Approve
                        </DropdownMenuItem>
                      )}

                      {(v.country === "Nigeria" || !v.country) && !paymentOk && (
                        <DropdownMenuItem onClick={() => overridePayment(v.id)} className="text-blue-600 focus:text-blue-600">
                          <Banknote className="h-4 w-4 mr-2" /> Override Payment
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => toggleSuspend(v)}
                        className={v.is_suspended ? "text-success focus:text-success" : "text-orange-600 focus:text-orange-600"}
                      >
                        {v.is_suspended
                          ? <><UserCheck className="h-4 w-4 mr-2" /> Unsuspend</>
                          : <><UserX    className="h-4 w-4 mr-2" /> Suspend</>}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => toggleVerify(v)}
                        className={v.is_verified ? "text-muted-foreground" : "text-primary focus:text-primary"}
                      >
                        {v.is_verified
                          ? <><ShieldOff  className="h-4 w-4 mr-2" /> Remove Verification</>
                          : <><ShieldCheck className="h-4 w-4 mr-2" /> Verify Vendor</>}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {promoted ? (
                        <DropdownMenuItem onClick={() => removePromotion(v.id)} className="text-muted-foreground">
                          <Megaphone className="h-4 w-4 mr-2" /> Remove Promotion
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => { setPromoteVendor(v); setPromoteDays(""); }}
                          className="text-yellow-600 focus:text-yellow-600"
                        >
                          <Megaphone className="h-4 w-4 mr-2" /> Promote Vendor
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {v.is_active && (
                        <DropdownMenuItem onClick={() => removeVendor(v.id)} className="text-destructive focus:text-destructive">
                          <X className="h-4 w-4 mr-2" /> Remove Vendor
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          );
        })}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
              No vendors in this category
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // ── Detail modal ────────────────────────────────────────────────────────────
  const pd = detailVendor?.vendor_private_details?.[0];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Manage Vendors</h1>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active & Pending ({activeVendors.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected / Removed ({rejectedVendors.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="border-border/50">
              <CardContent className="p-0 overflow-x-auto">
                {renderTable(activeVendors)}
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
                {renderTable(rejectedVendors, true)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Full Detail Dialog ── */}
      <Dialog open={!!detailVendor} onOpenChange={() => setDetailVendor(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {detailVendor?.business_name}
              {detailVendor?.is_verified  && <ShieldCheck className="h-4 w-4 text-primary" />}
              {isPromoted(detailVendor)   && <Star        className="h-4 w-4 text-yellow-500" />}
              {detailVendor?.is_suspended && <Badge className="bg-orange-500/20 text-orange-600 text-xs">Suspended</Badge>}
            </DialogTitle>
          </DialogHeader>

          {detailVendor && (
            <div className="space-y-5 text-sm">

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                {!detailVendor.is_approved && detailVendor.is_active && !detailVendor.is_suspended && (
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-8"
                    onClick={() => approveVendor(detailVendor.id)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                )}
                <Button size="sm" variant="outline"
                  className={detailVendor.is_suspended ? "text-success border-success/50" : "text-orange-600 border-orange-300"}
                  onClick={() => toggleSuspend(detailVendor)}>
                  {detailVendor.is_suspended
                    ? <><UserCheck className="h-3.5 w-3.5 mr-1" /> Unsuspend</>
                    : <><UserX    className="h-3.5 w-3.5 mr-1" /> Suspend</>}
                </Button>
                <Button size="sm" variant="outline"
                  className={detailVendor.is_verified ? "text-muted-foreground" : "text-primary border-primary/40"}
                  onClick={() => toggleVerify(detailVendor)}>
                  {detailVendor.is_verified
                    ? <><ShieldOff  className="h-3.5 w-3.5 mr-1" /> Unverify</>
                    : <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verify</>}
                </Button>
                {isPromoted(detailVendor) ? (
                  <Button size="sm" variant="outline" className="text-muted-foreground"
                    onClick={() => removePromotion(detailVendor.id)}>
                    <Megaphone className="h-3.5 w-3.5 mr-1" /> Remove Promo
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-400"
                    onClick={() => { setPromoteVendor(detailVendor); setPromoteDays(""); }}>
                    <Megaphone className="h-3.5 w-3.5 mr-1" /> Promote
                  </Button>
                )}
              </div>

              {/* Payment banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="font-medium text-muted-foreground">Payment</span>
                <div className="flex items-center gap-2">
                  <PaymentBadge status={detailVendor.payment_status} />
                  {(!detailVendor.payment_status || detailVendor.payment_status === "unpaid") && detailVendor.country === "Nigeria" && (
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 text-xs h-7"
                      onClick={() => overridePayment(detailVendor.id)}>
                      <Banknote className="h-3 w-3 mr-1" /> Override
                    </Button>
                  )}
                </div>
              </div>

              {/* Promo banner */}
              {isPromoted(detailVendor) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-yellow-700 text-xs font-medium">
                  <Star className="h-4 w-4 shrink-0" />
                  Promoted until {new Date(detailVendor.promoted_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}

              {/* ── Public info ── */}
              <div>
                <h4 className="font-semibold mb-2 text-foreground pb-1 border-b border-border/50">📢 Public Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/20 rounded-lg p-3 text-muted-foreground">
                  {[
                    ["Business Name",    detailVendor.business_name],
                    ["Country",          detailVendor.country || "Nigeria"],
                    ["Category",         detailVendor.category],
                    ["Customer Contact", detailVendor.contact_number],
                    ["Signup Email",     detailVendor._signup_email || "—"],
                    ["School",           detailVendor.schools?.name || "—"],
                    ["Campus Location",  detailVendor.campus_locations?.name || "—"],
                    ["Verified",         detailVendor.is_verified ? "✅ Yes" : "❌ No"],
                    ["Reels Enabled",    detailVendor.reels_enabled ? "✅ Yes" : "❌ No"],
                    ["Registered",       new Date(detailVendor.created_at).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <p key={label}><strong className="text-foreground">{label}:</strong> {value}</p>
                  ))}
                  {detailVendor.description && (
                    <p className="col-span-2"><strong className="text-foreground">Description:</strong> {detailVendor.description}</p>
                  )}
                </div>
              </div>

              {/* ── Private info (Super Admin sees ID doc) ── */}
              {pd ? (
                <div>
                  <h4 className="font-semibold mb-2 text-destructive pb-1 border-b border-border/50">🔒 Private Information (Super Admin Only)</h4>
                  <div className="space-y-2 bg-destructive/5 rounded-lg p-3 text-muted-foreground">
                    <p><strong className="text-foreground">Full Name:</strong> {pd.full_name}</p>
                    <p><strong className="text-foreground">Residential Location:</strong> {pd.residential_location}</p>
                    <p><strong className="text-foreground">Personal Contact:</strong> {pd.personal_contact}</p>

                    {pd.vendor_photo_url && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground mb-1">Vendor Photo</p>
                        <img src={pd.vendor_photo_url} alt="Vendor" className="w-24 h-24 rounded-lg object-cover border border-border" />
                      </div>
                    )}

                    {pd.id_document_url && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="font-medium text-foreground text-xs mb-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> ID Document
                        </p>
                        <a href={pd.id_document_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline text-xs font-medium hover:opacity-80">
                          View ID Document <ExternalLink className="h-3 w-3" />
                        </a>
                        {!detailVendor.is_verified && (
                          <Button size="sm" variant="outline"
                            className="mt-2 w-full text-xs h-8 border-primary/30 text-primary"
                            onClick={() => toggleVerify(detailVendor)}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Grant Verified Badge
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No private details on record.</p>
              )}

              {/* Product photos */}
              {detailVendor.vendor_images?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-foreground pb-1 border-b border-border/50">🖼 Product Photos</h4>
                  <div className="flex gap-2 flex-wrap">
                    {detailVendor.vendor_images.map((img: any, i: number) => (
                      <img key={i} src={img.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Promote Dialog ── */}
      <Dialog open={!!promoteVendor} onOpenChange={() => setPromoteVendor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-yellow-500" />
              Promote "{promoteVendor?.business_name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This vendor will appear at the top of the Browse page for the duration you set.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="promo-days-admin">Number of days</Label>
              <Input
                id="promo-days-admin"
                type="number"
                min="1"
                max="365"
                placeholder="e.g. 7"
                value={promoteDays}
                onChange={(e) => setPromoteDays(e.target.value)}
              />
              {promoteDays && Number(promoteDays) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ends: <strong>
                    {new Date(Date.now() + Number(promoteDays) * 86_400_000)
                      .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteVendor(null)}>Cancel</Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={handlePromote}
              disabled={!promoteDays || isNaN(Number(promoteDays)) || Number(promoteDays) < 1 || promoteLoading}
            >
              {promoteLoading
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Star     className="h-4 w-4 mr-2" />}
              Promote Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ManageVendors;
