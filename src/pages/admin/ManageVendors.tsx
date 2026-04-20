import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllVendors } from "@/hooks/useVendors";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check, X, Loader2, FileText, ShieldCheck, Globe, Ban,
  CreditCard, Banknote, CircleSlash, MoreVertical, ShieldOff, Megaphone, Pencil, Save,
  UserX, UserCheck, Star, ExternalLink, Crown,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const [searchQuery,    setSearchQuery]    = useState("");

  // School change state
  const [schools,          setSchools]          = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [changingSchool,   setChangingSchool]   = useState(false);

  // ── Edit vendor state ─────────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [savingEdit,  setSavingEdit]  = useState(false);
  const [editFields,  setEditFields]  = useState<Record<string, string>>({
    business_name: "", category: "", description: "", contact_number: "", country: "",
  });

  // Load all schools for the dropdown
  useEffect(() => {
    supabase.from("schools").select("id, name").order("name").then(({ data }) => {
      setSchools(data || []);
    });
  }, []);

  // Fetch signup email when detail dialog opens
  const openDetail = async (v: any) => {
    setDetailVendor({ ...v, _signup_email: "Loading..." });
    setSelectedSchoolId(v.school_id || "");
    try {
      const { data } = await supabase.functions.invoke("get-user-email", {
        body: { user_id: v.user_id },
      });
      setDetailVendor((prev: any) => prev ? { ...prev, _signup_email: data?.email || "—" } : prev);
    } catch {
      setDetailVendor((prev: any) => prev ? { ...prev, _signup_email: "—" } : prev);
    }
  };

  // Change vendor school
  const changeSchool = async () => {
    if (!detailVendor || !selectedSchoolId || selectedSchoolId === detailVendor.school_id) return;
    setChangingSchool(true);
    const schoolName = schools.find((s) => s.id === selectedSchoolId)?.name || "—";
    const { error } = await supabase.from("vendors").update({ school_id: selectedSchoolId } as any).eq("id", detailVendor.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `School changed to ${schoolName} ✅` });
      setDetailVendor((prev: any) => prev ? { ...prev, school_id: selectedSchoolId, schools: { name: schoolName } } : prev);
      refetch();
    }
    setChangingSchool(false);
  };

  // Core patch helper
  const patch = async (id: string, payload: any, successMsg: string) => {
    const { error } = await supabase.from("vendors").update(payload as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    toast({ title: successMsg });
    refetch();
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

  const upgradeStore = async (v: any) => {
    const endsAt = new Date(Date.now() + 30 * 86400000).toISOString();
    await run(v.id, async () => {
      await (supabase as any).from("vendor_store_upgrades").insert({
        vendor_id: v.id,
        payment_status: "confirmed",
        payment_reference: "admin_manual",
        amount: 0,
        confirmed_by: (await supabase.auth.getUser()).data.user?.id,
        starts_at: new Date().toISOString(),
        ends_at: endsAt,
      });
      await patch(v.id, { is_store_upgraded: true, store_upgrade_expires_at: endsAt }, "Store upgraded manually ✅");
      await (supabase as any).from("vendor_notifications").insert({
        vendor_id: v.id, type: "store_upgrade",
        title: "🎉 Store Upgraded by Admin!",
        message: "Your premium store has been activated by an admin for 30 days.",
        is_read: false,
      });
    });
  };

  const removeStoreUpgrade = (id: string) => run(id, () =>
    patch(id, { is_store_upgraded: false, store_upgrade_expires_at: null }, "Store upgrade removed")
  );

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

  const filterBySearch = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((v: any) =>
      v.business_name?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.schools?.name?.toLowerCase().includes(q) ||
      v.contact_number?.toLowerCase().includes(q)
    );
  };

  const activeVendors   = filterBySearch(vendors.filter((v: any) => v.is_active !== false));
  const rejectedVendors = filterBySearch(vendors.filter((v: any) => v.is_active === false));

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
              <TableCell>
                <button
                  onClick={() => openDetail(v)}
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

                      <DropdownMenuItem onClick={() => openDetail(v)}>
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

                      {v.is_store_upgraded && v.store_upgrade_expires_at && new Date(v.store_upgrade_expires_at) > new Date() ? (
                        <DropdownMenuItem onClick={() => removeStoreUpgrade(v.id)} className="text-muted-foreground">
                          <Crown className="h-4 w-4 mr-2" /> Remove Store Upgrade
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => upgradeStore(v)} className="text-accent focus:text-accent">
                          <Crown className="h-4 w-4 mr-2" /> Upgrade Store
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

  // ── Save vendor edits ───────────────────────────────────────────────────────
  const openEditMode = (v: any) => {
    setEditFields({
      business_name:  v.business_name   || "",
      category:       v.category        || "",
      description:    v.description     || "",
      contact_number: v.contact_number  || "",
      country:        v.country         || "Nigeria",
    });
    setEditMode(true);
  };

  const saveVendorEdit = async () => {
    if (!detailVendor) return;
    setSavingEdit(true);
    const { error } = await supabase.from("vendors").update({
      business_name:  editFields.business_name.trim()  || detailVendor.business_name,
      category:       editFields.category.trim()       || detailVendor.category,
      description:    editFields.description.trim()    || null,
      contact_number: editFields.contact_number.trim() || null,
      country:        editFields.country.trim()        || "Nigeria",
    } as any).eq("id", detailVendor.id);
    if (!error) {
      // Update the detailVendor in place so modal reflects changes immediately
      setDetailVendor((v: any) => v ? { ...v, ...editFields } : v);
      // Refetch full vendor list so table also updates
      refetch();
      toast({ title: "✅ Vendor info updated!" });
      setEditMode(false);
    } else {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
    setSavingEdit(false);
  };

  // ── Detail modal ────────────────────────────────────────────────────────────
  const pd = detailVendor?.vendor_private_details?.[0];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Manage Vendors</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

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
      <Dialog open={!!detailVendor} onOpenChange={() => { setDetailVendor(null); setEditMode(false); }}>
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
                <Button size="sm" variant="outline" className="text-blue-500 border-blue-400/50"
                  onClick={() => openEditMode(detailVendor)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Info
                </Button>
                {detailVendor.is_store_upgraded && detailVendor.store_upgrade_expires_at && new Date(detailVendor.store_upgrade_expires_at) > new Date() ? (
                  <Button size="sm" variant="outline" className="text-muted-foreground"
                    onClick={() => removeStoreUpgrade(detailVendor.id)}>
                    <Crown className="h-3.5 w-3.5 mr-1" /> Remove Store Upgrade
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-accent border-accent/40"
                    onClick={() => upgradeStore(detailVendor)}>
                    <Crown className="h-3.5 w-3.5 mr-1" /> Upgrade Store
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

              {/* ── Change School ── */}
              <div className="p-3 rounded-lg border border-blue-400/30 bg-blue-500/5 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" /> Change Vendor's School
                </h4>
                <p className="text-xs text-muted-foreground">
                  Current school: <strong className="text-foreground">{detailVendor.schools?.name || "None assigned"}</strong>
                </p>
                <div className="flex gap-2">
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <SelectValue placeholder="Select new school…" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={changeSchool}
                    disabled={changingSchool || !selectedSchoolId || selectedSchoolId === detailVendor.school_id}
                    className="h-9 px-4 bg-blue-500 text-white hover:bg-blue-600 border-0"
                  >
                    {changingSchool ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>

              {/* ── Public info ── */}
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-border/50 mb-3">
                  <h4 className="font-semibold text-foreground">📢 Public Information</h4>
                  {!editMode && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-500"
                      onClick={() => openEditMode(detailVendor)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-3 bg-blue-500/5 border border-blue-400/20 rounded-lg p-4">
                    <p className="text-xs text-blue-400 font-medium">✏️ Editing vendor information</p>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Business Name</label>
                      <Input value={editFields.business_name}
                        onChange={(e) => setEditFields((f) => ({ ...f, business_name: e.target.value }))}
                        className="h-8 text-sm" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Category</label>
                      <Input value={editFields.category}
                        onChange={(e) => setEditFields((f) => ({ ...f, category: e.target.value }))}
                        className="h-8 text-sm" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Description</label>
                      <textarea
                        value={editFields.description}
                        onChange={(e) => setEditFields((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Customer Contact</label>
                      <Input value={editFields.contact_number}
                        onChange={(e) => setEditFields((f) => ({ ...f, contact_number: e.target.value }))}
                        className="h-8 text-sm" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Country</label>
                      <Input value={editFields.country}
                        onChange={(e) => setEditFields((f) => ({ ...f, country: e.target.value }))}
                        className="h-8 text-sm" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={saveVendorEdit} disabled={savingEdit}
                        className="bg-blue-500 text-white hover:bg-blue-600 border-0 h-8">
                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditMode(false)} className="h-8">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
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
                      ["Store Upgraded",   detailVendor.is_store_upgraded && detailVendor.store_upgrade_expires_at && new Date(detailVendor.store_upgrade_expires_at) > new Date()
                        ? `✅ Until ${new Date(detailVendor.store_upgrade_expires_at).toLocaleDateString()}`
                        : "❌ No"],
                      ["Registered",       new Date(detailVendor.created_at).toLocaleDateString()],
                    ].map(([label, value]) => (
                      <p key={label}><strong className="text-foreground">{label}:</strong> {value}</p>
                    ))}
                    {detailVendor.description && (
                      <p className="col-span-2"><strong className="text-foreground">Description:</strong> {detailVendor.description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Private info ── */}
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
                type="number" min="1" max="365"
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
              {promoteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
              Promote Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ManageVendors;
