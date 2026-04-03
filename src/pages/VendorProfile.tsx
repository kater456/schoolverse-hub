import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Phone, MessageCircle, Heart, MessageSquare, Eye,
  Send, Loader2, Star, ShieldCheck, Instagram, Twitter, Music2,
  ZoomIn, X, ChevronLeft, ChevronRight, Flag, Upload, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ContactVendorButton from "@/components/ContactVendorButton";

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ images, startIndex, onClose }: {
  images: string[]; startIndex: number; onClose: () => void;
}) => {
  const [current, setCurrent] = useState(startIndex);
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {current + 1} / {images.length}
        </span>
      )}

      {/* Prev */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* Image */}
      <img src={images[current]} alt="" draggable={false}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg select-none"
        onClick={(e) => e.stopPropagation()} />

      {/* Next */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((src, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all ${
                i === current ? "border-white scale-110" : "border-white/30 opacity-60"
              }`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vendor, setVendor]               = useState<any>(null);
  const [images, setImages]               = useState<any[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen]   = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImageUrls = images.map((img) => img.image_url).filter(Boolean);

  const openLightbox = (url: string) => {
    const idx = allImageUrls.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const [liked, setLiked]             = useState(false);
  const [likeCount, setLikeCount]     = useState(0);
  const [comments, setComments]       = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [viewCount, setViewCount]     = useState(0);

  const [ratings, setRatings]                   = useState<any[]>([]);
  const [avgRating, setAvgRating]               = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0,0,0,0,0]);
  const [userRating, setUserRating]             = useState(0);
  const [userReview, setUserReview]             = useState("");
  const [hasRated, setHasRated]                 = useState(false);
  const [hoverRating, setHoverRating]           = useState(0);
  const [canRate, setCanRate]                   = useState(false);
  const [activeDeals, setActiveDeals]           = useState<any[]>([]);

  // ── Report state ──────────────────────────────────────────────────────────
  const [reportOpen,     setReportOpen]     = useState(false);
  const [reportReason,   setReportReason]   = useState("");
  const [reportDetails,  setReportDetails]  = useState("");
  const [reportEvidence, setReportEvidence] = useState<string | null>(null);
  const [uploadingEvid,  setUploadingEvid]  = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("vendors")
        .select(`*, schools(name, id), campus_locations(name), vendor_images(*)`)
        .eq("id", id).single();

      if (data) {
        setVendor(data);
        setImages(data.vendor_images || []);
        const primary = data.vendor_images?.find((img: any) => img.is_primary);
        setSelectedImage(primary?.image_url || data.vendor_images?.[0]?.image_url || null);

        const viewKey = `vendor_viewed_${id}`;
        if (!sessionStorage.getItem(viewKey)) {
          await supabase.from("vendor_views").insert({
            vendor_id: id, viewer_id: user?.id || null, school_id: data.schools?.id || null,
          } as any);
          sessionStorage.setItem(viewKey, "1");
        }

        const [viewsRes, likesRes, userLike, commentsRes, ratingsRes] = await Promise.all([
          supabase.from("vendor_views").select("id", { count: "exact", head: true }).eq("vendor_id", id),
          supabase.from("vendor_likes").select("id", { count: "exact", head: true }).eq("vendor_id", id),
          user ? supabase.from("vendor_likes").select("id").eq("vendor_id", id).eq("user_id", user.id) : Promise.resolve({ data: [] }),
          supabase.from("vendor_comments").select("*, profiles:user_id(first_name, last_name)").eq("vendor_id", id).order("created_at", { ascending: false }).limit(20),
          supabase.from("vendor_ratings").select("*").eq("vendor_id", id),
        ]);

        setViewCount(viewsRes.count || 0);
        setLikeCount(likesRes.count || 0);
        setLiked((userLike as any).data?.length > 0);
        setComments(commentsRes.data || []);

        const allRatings = ratingsRes.data || [];
        setRatings(allRatings);
        if (allRatings.length > 0) {
          const avg = allRatings.reduce((s: number, r: any) => s + r.rating, 0) / allRatings.length;
          setAvgRating(avg);
          const dist = [0,0,0,0,0];
          allRatings.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
          setRatingDistribution(dist);
        }

        if (user) {
          const userR = allRatings.find((r: any) => r.user_id === user.id);
          if (userR) { setUserRating(userR.rating); setUserReview(userR.review || ""); setHasRated(true); }
          const { data: txn } = await supabase.from("transactions").select("id")
            .eq("vendor_id", id).eq("user_id", user.id).eq("status", "completed").limit(1);
          setCanRate(!!txn && txn.length > 0);
        }

        // Fetch active deals
        const { data: dealsData } = await supabase
          .from("vendor_deals")
          .select("*")
          .eq("vendor_id", id)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: true });
        setActiveDeals(dealsData || []);
      }
      setIsLoading(false);
    };
    fetchVendor();
  }, [id, user]);

  const requireAuth = (action: string) => {
    if (!user) {
      toast({ title: `Sign in to ${action}`, description: "Create an account to interact with businesses", variant: "destructive" });
      navigate("/signup"); return false;
    }
    return true;
  };

  const sendNotification = async (vendorId: string, type: string, title: string, message: string) => {
    // Insert notification
    await (supabase as any).from("vendor_notifications").insert({
      vendor_id: vendorId, type, title, message, is_read: false,
    });
    // Send email (best-effort, don't await)
    supabase.functions.invoke("send-vendor-notification-email", {
      body: { vendor_id: vendorId, type, title, message },
    }).catch(() => {});
  };

  const toggleLike = async () => {
    if (!requireAuth("like")) return;
    if (liked) {
      await supabase.from("vendor_likes").delete().eq("vendor_id", id!).eq("user_id", user!.id);
      setLiked(false); setLikeCount((c) => c - 1);
    } else {
      await supabase.from("vendor_likes").insert({ vendor_id: id!, user_id: user!.id } as any);
      setLiked(true); setLikeCount((c) => {
        const newCount = c + 1;
        // Check milestones
        const milestones = [10, 50, 100, 500, 1000];
        if (milestones.includes(newCount)) {
          sendNotification(id!, "milestone", `${newCount} Likes! 🎉`, `Your business just hit ${newCount} likes! Keep up the great work.`);
        }
        return newCount;
      });
      sendNotification(id!, "like", "New Like ❤️", `Someone liked your business!`);
    }
  };

  const submitComment = async () => {
    if (!requireAuth("comment")) return;
    if (!commentText.trim()) return;
    const { data, error } = await supabase.from("vendor_comments")
      .insert({ vendor_id: id!, user_id: user!.id, content: commentText.trim() } as any)
      .select("*, profiles:user_id(first_name, last_name)").single();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setComments((prev) => [data, ...prev]);
      setCommentText("");
      sendNotification(id!, "comment", "New Comment 💬", `Someone commented: "${commentText.trim().slice(0, 100)}"`);
    }
  };

  const submitRating = async () => {
    if (!requireAuth("rate")) return;
    if (userRating === 0) return;
    if (!canRate) { toast({ title: "Cannot rate yet", description: "Complete a transaction with this vendor first.", variant: "destructive" }); return; }
    const op = hasRated
      ? supabase.from("vendor_ratings").update({ rating: userRating, review: userReview || null } as any).eq("vendor_id", id!).eq("user_id", user!.id)
      : supabase.from("vendor_ratings").insert({ vendor_id: id!, user_id: user!.id, rating: userRating, review: userReview || null } as any);
    const { error } = await op;
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: hasRated ? "Rating updated!" : "Thanks for your rating!" });
    setHasRated(true);
    const { data } = await supabase.from("vendor_ratings").select("*").eq("vendor_id", id!);
    setRatings(data || []);
    if (data && data.length > 0) {
      setAvgRating(data.reduce((s: number, r: any) => s + r.rating, 0) / data.length);
      const dist = [0,0,0,0,0];
      data.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
      setRatingDistribution(dist);
    }
  };

  const uploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    setUploadingEvid(true);
    const path = `reports/${vendor.id}-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from("vendor-media").upload(path, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(data.path);
      setReportEvidence(urlData.publicUrl);
      toast({ title: "Evidence uploaded ✅" });
    }
    setUploadingEvid(false);
  };

  const submitReport = async () => {
    if (!reportReason) { toast({ title: "Select a reason", variant: "destructive" }); return; }
    if (!requireAuth("report")) return;
    setSubmittingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("report-vendor", {
        body: {
          vendor_id: id,
          reporter_id: user!.id,
          reason: reportReason,
          details: reportDetails || null,
          evidence_url: reportEvidence || null,
        },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || "Failed to submit");
      toast({
        title: data.auto_suspended ? "🚨 Vendor suspended" : "Report submitted ✅",
        description: data.message,
      });
      setReportOpen(false);
      setReportReason(""); setReportDetails(""); setReportEvidence(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReport(false);
    }
  };

  const trackContact = async (type: string) => {
    await supabase.from("vendor_contacts").insert({
      vendor_id: id!, contact_type: type, school_id: vendor?.schools?.id || null,
    } as any);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="flex justify-center items-center pt-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="text-center pt-32"><h2 className="text-xl font-semibold">Vendor not found</h2></div>
    </div>
  );

  const totalRatings = ratings.length;
  const hasSocialLinks = vendor.is_verified && (vendor.social_instagram || vendor.social_tiktok || vendor.social_twitter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {lightboxOpen && allImageUrls.length > 0 && (
        <Lightbox images={allImageUrls} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <main className="pt-20 pb-16 px-3 sm:px-4">
        <div className="w-full max-w-4xl mx-auto overflow-x-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── Image Gallery ── */}
            <div>
              <div
                className="relative aspect-square bg-muted rounded-xl overflow-hidden mb-4 cursor-zoom-in group"
                onClick={() => selectedImage && openLightbox(selectedImage)}
              >
                {selectedImage ? (
                  <>
                    <img src={selectedImage} alt={vendor.business_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <div className="bg-white/90 rounded-full p-2">
                        <ZoomIn className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🏪</div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img: any) => (
                    <button key={img.id}
                      onClick={() => { setSelectedImage(img.image_url); openLightbox(img.image_url); }}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all group ${
                        selectedImage === img.image_url ? "border-accent" : "border-transparent hover:border-accent/50"
                      }`}>
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-3 w-3 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 py-3 border-t border-border/50">
                <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm">
                  <Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  <span className="text-muted-foreground">{likeCount}</span>
                </button>
                <div className="flex items-center gap-1.5 text-sm">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{comments.length}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{viewCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm ml-auto">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-muted-foreground">{avgRating.toFixed(1)} ({totalRatings})</span>
                </div>
              </div>
            </div>

            {/* ── Info Column ── */}
            <div>
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <Avatar className="h-10 w-10 border-2 border-accent shrink-0">
                  {selectedImage ? <AvatarImage src={selectedImage} alt={vendor.business_name} /> : null}
                  <AvatarFallback className="bg-accent/10 text-accent">{vendor.business_name?.charAt(0) || "V"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground break-words">{vendor.business_name}</h1>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {vendor.is_verified && (
                      <Badge className="bg-primary/10 text-primary text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {vendor.is_vendor_of_week && vendor.vendor_of_week_expires_at && new Date(vendor.vendor_of_week_expires_at) > new Date() && (
                      <Badge className="bg-accent/20 text-accent text-xs">🏆 Vendor of the Week</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{vendor.category}</Badge>
                {vendor.schools?.name && <Badge variant="outline">🎓 {vendor.schools.name}</Badge>}
                {vendor.campus_locations?.name && (
                  <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{vendor.campus_locations.name}</Badge>
                )}
              </div>

              {vendor.description && <p className="text-muted-foreground mb-6">{vendor.description}</p>}

              {/* Ratings */}
              <Card className="border-border/50 mb-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Customer Ratings</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{avgRating.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 justify-center my-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">{totalRatings} rating{totalRatings !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5,4,3,2,1].map((star) => {
                        const count = ratingDistribution[star - 1];
                        const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-muted-foreground">{star}</span>
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="w-6 text-right text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {user && canRate && (
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs text-muted-foreground mb-2">{hasRated ? "Update your rating" : "Rate your experience"}</p>
                      <div className="flex items-center gap-1 mb-2">
                        {[1,2,3,4,5].map((star) => (
                          <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setUserRating(star)} className="transition-transform hover:scale-110">
                            <Star className={`h-6 w-6 ${star <= (hoverRating || userRating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea placeholder="Write a review (optional)..." value={userReview}
                        onChange={(e) => setUserReview(e.target.value)} className="mb-2 text-sm" rows={2} />
                      <Button size="sm" onClick={submitRating} disabled={userRating === 0}>
                        {hasRated ? "Update Rating" : "Submit Rating"}
                      </Button>
                    </div>
                  )}
                  {user && !canRate && !hasRated && (
                    <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                      💡 Complete a transaction with this vendor to leave a rating.
                    </p>
                  )}
                  {!user && <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">Sign in and complete a transaction to leave a rating.</p>}
                </CardContent>
              </Card>

              {/* Social */}
              {hasSocialLinks && (
                <Card className="border-primary/20 bg-primary/5 mb-4">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Social Media
                    </h3>
                    <div className="space-y-2">
                      {vendor.social_instagram && (
                        <a href={vendor.social_instagram} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                          <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20">
                            <Instagram className="h-4 w-4 text-pink-500" />
                          </div>Instagram
                        </a>
                      )}
                      {vendor.social_tiktok && (
                        <a href={vendor.social_tiktok} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                          <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center group-hover:bg-foreground/20">
                            <Music2 className="h-4 w-4" />
                          </div>TikTok
                        </a>
                      )}
                      {vendor.social_twitter && (
                        <a href={vendor.social_twitter} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20">
                            <Twitter className="h-4 w-4 text-sky-500" />
                          </div>X / Twitter
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Deals */}
              {activeDeals.length > 0 && (
                <Card className="border-orange-400/40 bg-orange-500/5 mb-4">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      🔥 Active Deals
                    </h3>
                    <div className="space-y-3">
                      {activeDeals.map((deal) => {
                        const diff  = new Date(deal.expires_at).getTime() - Date.now();
                        const h     = Math.floor(diff / 3_600_000);
                        const m     = Math.floor((diff % 3_600_000) / 60_000);
                        const left  = h > 24 ? `${Math.floor(h/24)}d ${h%24}h left` : `${h}h ${m}m left`;
                        const disc  = deal.original_price && deal.original_price > deal.deal_price
                          ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100)
                          : null;
                        return (
                          <div key={deal.id} className="border-b border-orange-400/20 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{deal.title}</p>
                                {deal.description && <p className="text-xs text-muted-foreground mt-0.5">{deal.description}</p>}
                                <div className="flex items-center gap-2 mt-1">
                                  {deal.original_price && (
                                    <span className="text-xs line-through text-muted-foreground">₦{deal.original_price.toLocaleString()}</span>
                                  )}
                                  <span className="text-sm font-bold text-success">₦{deal.deal_price.toLocaleString()}</span>
                                  {disc && <Badge className="bg-success/20 text-success text-xs">-{disc}%</Badge>}
                                </div>
                              </div>
                              <span className="text-xs text-orange-600 shrink-0 flex items-center gap-1">
                                ⏰ {left}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact */}
              <Card className="border-border/50 mb-4">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Contact</h3>

                  {/* In-platform messaging — primary CTA */}
                  <ContactVendorButton
                    vendorId={vendor.id}
                    vendorUserId={vendor.user_id}
                    variant="default"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    label="Message on Campus Market"
                  />

                  {vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => trackContact("call")} asChild>
                      <a href={`tel:${vendor.contact_number}`}><Phone className="h-4 w-4 mr-2" />{vendor.contact_number}</a>
                    </Button>
                  )}
                  {vendor.messaging_enabled && vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => trackContact("whatsapp")} asChild>
                      <a href={`https://wa.me/${vendor.contact_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! I'm reaching out from Campus Market 🛍️. I'm interested in your ${vendor.business_name} and would like to know more. Can you help me?`)}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2" />Message on WhatsApp
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Report vendor — only for logged-in users */}
              {user && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive text-xs gap-1.5"
                    onClick={() => setReportOpen(true)}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report Vendor
                  </Button>
                </div>
              )}

              {/* Comments */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Comments ({comments.length})</h3>
                  <div className="flex gap-2 mb-4">
                    <Input placeholder={user ? "Write a comment..." : "Sign in to comment"} value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()} className="h-9 text-sm" />
                    <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                    ) : comments.map((c: any) => (
                      <div key={c.id} className="border-b border-border/30 pb-2 last:border-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {(c.profiles as any)?.first_name || "User"} {(c.profiles as any)?.last_name || ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* ── Report Dialog ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Flag className="h-4 w-4" /> Report Vendor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                After 5 verified reports this vendor will be automatically suspended and admin will be notified immediately.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Select onValueChange={setReportReason} value={reportReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scam / Fraud">Scam / Fraud</SelectItem>
                  <SelectItem value="Fake products">Fake products</SelectItem>
                  <SelectItem value="Did not deliver">Did not deliver</SelectItem>
                  <SelectItem value="Harassment">Harassment</SelectItem>
                  <SelectItem value="Misleading information">Misleading information</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Textarea
                placeholder="Describe what happened..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Evidence Screenshot (optional)</Label>
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                reportEvidence ? "border-success bg-success/5" : "border-border hover:border-primary"
              }`}>
                {uploadingEvid ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs">Uploading…</span></>
                ) : reportEvidence ? (
                  <><ShieldCheck className="h-4 w-4 text-success" /><span className="text-xs text-success font-medium">Screenshot uploaded ✅</span></>
                ) : (
                  <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload screenshot</span></>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={uploadEvidence} disabled={uploadingEvid} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={submitReport}
              disabled={!reportReason || submittingReport}
            >
              {submittingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default VendorProfile;
