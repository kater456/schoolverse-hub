import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  Check, X, Loader2, ShieldCheck, Globe, Ban,
  CreditCard, Banknote, CircleSlash, MoreVertical, ShieldOff, Megaphone,
  UserX, UserCheck, Star, Film, Search, Crown, Sparkles, Zap, Calendar,
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

const ManageVendorsSubAdmin = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [vendors,        setVendors]        = useState<any[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [detailVendor,   setDetailVendor]   = useState<any>(null);
  const [promoteVendor,  setPromoteVendor]  = useState<any>(null);
  const [promoteDays,    setPromoteDays]    = useState("");
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");

  const getSchoolId = () => (userRole as any)?.assigned_school_id || (userRole as any)?.school_id;

  const fetchVendors = async () => {
    setIsLoading(true);
    const schoolId = getSchoolId();

    let q = supabase.from("vendors").select(`
      id, business_name, category, description, contact_number,
      country, is_approved, is_active, is_verified, is_suspended,
      reels_enabled, payment_status, payment_reference, promoted_until, created_at,
      is_store_upgraded, store_upgrade_expires_at, ai_video_enabled,
      academic_level, department,
      schools(name),
      campus_locations(name),
      vendor_private_details(full_name, vendor_photo_url, residential_location, personal_contact, address, city, landmark),
      vendor_images(image_url, is_primary, display_order)
    `).order("created_at", { ascending: false });

    if (schoolId) q = q.eq("school_id", schoolId) as any;

    const { data, error } = await q;
    if (error) toast({ title: "Error loading vendors", description: error.message, variant: "destructive" });
    else setVendors(data || []);
    setIsLoading(false);
  };

  useEffect(() => { if (user && userRole) fetchVendors(); }, [user, userRole]);

  // Core patch helper
  const patch = async (id: string, payload: any, successMsg: string) => {
    const { error } = await supabase.from("vendors").update(payload as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    toast({ title: successMsg });
    setVendors((prev) => prev.map((v) => v.id === id ? { ...v, ...payload } : v));
    setDetailVendor((prev: any) => prev?.id === id ? { ...prev, ...payload } : prev);
    // Log activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user!.id, action: successMsg, target_type: "vendor", target_id: id,
    } as any);
    return true;
  };

  const run = async (id: string, fn: () => Promise<any>) => {
    setActionLoading(id);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor    = (id: string) => run(id, async () => {
    const ok = await patch(id, { is_approved: true }, "Vendor approved ✅");
    if (ok) {
      supabase.functions.invoke("notify-super-admin", {
        body: { type: "new_vendor", title: "New vendor joined", message: "A new vendor has been approved on your campus." },
      }).catch(() => {});
    }
  });
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

  const toggleReels = (v: any) => run(v.id, () =>
    patch(v.id, { reels_enabled: !v.reels_enabled }, v.reels_enabled ? "Reels revoked" : "Reels granted ✅")
  );

  // ── NEW: Store upgrade & AI video overrides ─────────────────────────────
  const grantStoreUpgrade = (v: any) => run(v.id, () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    return patch(v.id, {
      is_store_upgraded: true,
      store_upgrade_expires_at: expires.toISOString(),
    }, "Store upgrade granted (30 days) ✅");
  });

  const revokeStoreUpgrade = (v: any) => run(v.id, () =>
    patch(v.id, {
      is_store_upgraded: false,
      store_upgrade_expires_at: null,
    }, "Store upgrade revoked")
  );

  const grantAIVideo = (v: any) => run(v.id, () =>
    patch(v.id, { ai_video_enabled: true }, "AI Video access granted ✅")
  );

  const revokeAIVideo = (v: any) => run(v.id, () =>
    patch(v.id, { ai_video_enabled: false }, "AI Video access revoked")
  );

  const isUpgradeActive = (v: any) =>
    v?.is_store_upgraded === true &&
    (!v?.store_upgrade_expires_at || new Date(v.store_upgrade_expires_at) > new Date());

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
      v.contact_number?.toLowerCase().includes(q)
    );
  };

  const pendingVendors  = filterBySearch(vendors.filter((v) => v.is_active !== false && !v.is_approved));
  const approvedVendors = filterBySearch(vendors.filter((v) => v.is_active !== false && v.is_approved));
  const removedVendors  = filterBySearch(vendors.filter((v) => v.is_active === false));
  const proVendors      = filterBySearch(vendors.filter((v) =>
    v.is_store_upgraded === true &&
    (!v.store_upgrade_expires_at || new Date(v.store_upgrade_expires_at) > new Date())
  ));

  // ── Table renderer ──────────────────────────────────────────────────────────
  const renderTable = (list: any[], showReactivate = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Promo</TableHead>
          <TableHead className="w-[52px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((v) => {
          const paymentOk = ["paid", "overridden", "free"].includes(v.payment_status);
          const promoted  = isPromoted(v);

          return (
            <TableRow key={v.id} className={v.is_suspended ? "opacity-60" : ""}>

              {/* Clickable name */}
              <TableCell>
                <button
                  onClick={() => setDetailVendor(v)}
                  className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary hover:underline text-left transition-colors group"
                >
                  <span className="group-hover:underline">{v.business_name}</span>
                  {v.is_verified  && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                  {promoted       && <Star        className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                  {v.is_suspended && <Ban         className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                  {v.reels_enabled && <Film        className="h-3.5 w-3.5 text-accent shrink-0" />}
                </button>
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="text-xs gap-1">
                  <Globe className="h-3 w-3" />{v.country || "Nigeria"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{v.category}</TableCell>
              <TableCell><PaymentBadge status={v.payment_status} /></TableCell>
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
                        <ShieldCheck className="h-4 w-4 mr-2" /> View Full Details
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

                      <DropdownMenuItem onClick={() => toggleReels(v)}
                        className={v.reels_enabled ? "text-muted-foreground" : "text-accent focus:text-accent"}>
                        <Film className="h-4 w-4 mr-2" />
                        {v.reels_enabled ? "Revoke Reels" : "Grant Reels"}
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
            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
              No vendors here
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // ── Detail dialog ───────────────────────────────────────────────────────────
  const pd = detailVendor?.vendor_private_details?.[0];

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">Vendors</h2>
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
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingVendors.length > 0 && (
              <span className="ml-1.5 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                {pendingVendors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedVendors.length})</TabsTrigger>
          <TabsTrigger value="pro" className="gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            Pro {proVendors.length > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                {proVendors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="removed">Removed ({removedVendors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="text-base text-warning flex items-center gap-2">
                Pending Approvals
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

        <TabsContent value="pro">
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active Pro Stores",    value: proVendors.length,                                        color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
                { label: "AI Video Enabled",     value: vendors.filter((v) => v.ai_video_enabled).length,         color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
                { label: "Expiring This Week",   value: proVendors.filter((v) => {
                  if (!v.store_upgrade_expires_at) return false;
                  const diff = new Date(v.store_upgrade_expires_at).getTime() - Date.now();
                  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
                }).length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-3 ${bg}`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Pro vendor cards */}
            {proVendors.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Crown className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No active Pro vendors yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Vendors who upgrade their store will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {proVendors.map((v: any) => {
                  const expires = v.store_upgrade_expires_at ? new Date(v.store_upgrade_expires_at) : null;
                  const expiringSoon = expires ? (expires.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 : false;
                  return (
                    <Card key={v.id} className={`border ${expiringSoon ? "border-red-200" : "border-amber-200/60"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm">{v.business_name}</span>
                              {v.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-1">
                                <Crown className="h-2.5 w-2.5" /> Pro Active
                              </span>
                              {v.ai_video_enabled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5" /> AI Video
                                </span>
                              )}
                              {expiringSoon && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                                  ⚠ Expiring Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{v.category} · {v.schools?.name}</p>
                            {expires && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Upgrade expires: {expires.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            )}
                          </div>

                          {/* Override actions */}
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className={v.ai_video_enabled ? "text-muted-foreground text-xs h-7" : "text-purple-600 border-purple-300 text-xs h-7"}
                              disabled={actionLoading === v.id}
                              onClick={() => v.ai_video_enabled ? revokeAIVideo(v) : grantAIVideo(v)}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {v.ai_video_enabled ? "Revoke AI Video" : "Grant AI Video"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600 border-amber-300 text-xs h-7"
                              disabled={actionLoading === v.id}
                              onClick={() => grantStoreUpgrade(v)}
                            >
                              <Crown className="h-3 w-3 mr-1" /> Extend 30 Days
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 text-xs h-7"
                              disabled={actionLoading === v.id}
                              onClick={() => revokeStoreUpgrade(v)}
                            >
                              <X className="h-3 w-3 mr-1" /> Revoke Pro
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Grant Pro to any vendor */}
            <Card className="border-dashed border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Grant Pro Access to Any Vendor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Search for a vendor below to manually grant or override Pro access without a payment.
                  Use this for partnerships, compensation, or testing.
                </p>
                <div className="space-y-2">
                  {approvedVendors.filter((v: any) => !isUpgradeActive(v)).slice(0, 8).map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <p className="text-xs font-medium">{v.business_name}</p>
                        <p className="text-[10px] text-muted-foreground">{v.category}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 border-amber-200 text-xs h-7 gap-1"
                        disabled={actionLoading === v.id}
                        onClick={() => grantStoreUpgrade(v)}
                      >
                        {actionLoading === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                        Grant 30 Days
                      </Button>
                    </div>
                  ))}
                  {approvedVendors.filter((v: any) => !isUpgradeActive(v)).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">All approved vendors already have Pro access</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* ── Full Detail Dialog (no ID document for sub-admin) ── */}
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
                <Button size="sm" variant="outline"
                  className={detailVendor.reels_enabled ? "text-muted-foreground" : "text-accent border-accent/40"}
                  onClick={() => toggleReels(detailVendor)}>
                  <Film className="h-3.5 w-3.5 mr-1" />
                  {detailVendor.reels_enabled ? "Revoke Reels" : "Grant Reels"}
                </Button>
                {/* Pro Store Override */}
                {isUpgradeActive(detailVendor) ? (
                  <Button size="sm" variant="outline" className="text-muted-foreground"
                    onClick={() => revokeStoreUpgrade(detailVendor)}>
                    <Crown className="h-3.5 w-3.5 mr-1 text-amber-500" /> Revoke Pro
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-amber-600 border-amber-300"
                    onClick={() => grantStoreUpgrade(detailVendor)}>
                    <Crown className="h-3.5 w-3.5 mr-1" /> Grant Pro (30d)
                  </Button>
                )}
                {/* AI Video Override */}
                <Button size="sm" variant="outline"
                  className={detailVendor.ai_video_enabled ? "text-muted-foreground" : "text-purple-600 border-purple-300"}
                  onClick={() => detailVendor.ai_video_enabled ? revokeAIVideo(detailVendor) : grantAIVideo(detailVendor)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {detailVendor.ai_video_enabled ? "Revoke AI Video" : "Grant AI Video"}
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

              {/* Payment */}
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

              {/* Public info */}
              <div>
                <h4 className="font-semibold mb-2 text-foreground pb-1 border-b border-border/50">📢 Public Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/20 rounded-lg p-3 text-muted-foreground">
                  {[
                    ["Business Name",    detailVendor.business_name],
                    ["Country",          detailVendor.country || "Nigeria"],
                    ["Category",         detailVendor.category],
                    ["Customer Contact", detailVendor.contact_number],
                    ["School",           detailVendor.schools?.name || "—"],
                    ["Campus Location",  detailVendor.campus_locations?.name || "—"],
                    ["Verified",         detailVendor.is_verified ? "✅ Yes" : "❌ No"],
                    ["Reels Enabled",    detailVendor.reels_enabled ? "✅ Yes" : "❌ No"],
                    ["Registered",       new Date(detailVendor.created_at).toLocaleDateString()],
                    ["Academic Level",   detailVendor.academic_level || "—"],
                    ["Department",       detailVendor.department || "—"],
                    ["Street Address",   pd?.address || "—"],
                    ["City/Area",        pd?.city || "—"],
                    ["Landmark",         pd?.landmark || "—"],
                  ].map(([label, value]) => (
                    <p key={label}><strong className="text-foreground">{label}:</strong> {value}</p>
                  ))}
                  {detailVendor.description && (
                    <p className="col-span-2"><strong className="text-foreground">Description:</strong> {detailVendor.description}</p>
                  )}
                </div>
              </div>

              {/* Private info — NO id_document_url for sub-admin */}
              {pd ? (
                <div>
                  <h4 className="font-semibold mb-2 text-destructive pb-1 border-b border-border/50">🔒 Private Information (Admin Only)</h4>
                  <div className="space-y-1.5 bg-destructive/5 rounded-lg p-3 text-muted-foreground">
                    <p><strong className="text-foreground">Full Name:</strong> {pd.full_name}</p>
                    <p><strong className="text-foreground">Residential Location:</strong> {pd.residential_location}</p>
                    <p><strong className="text-foreground">Personal Contact:</strong> {pd.personal_contact}</p>
                    {pd.vendor_photo_url && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground mb-1">Vendor Photo</p>
                        <img src={pd.vendor_photo_url} alt="Vendor" className="w-24 h-24 rounded-lg object-cover border border-border" />
                      </div>
                    )}
                    {/* ID doc intentionally hidden */}
                    <p className="text-xs text-muted-foreground italic mt-2 flex items-center gap-1">
                      🔐 ID document is visible to Super Admin only
                    </p>
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
              <Label htmlFor="promo-days-sub">Number of days</Label>
              <Input
                id="promo-days-sub"
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
    </>
  );
};

export default ManageVendorsSubAdmin;
