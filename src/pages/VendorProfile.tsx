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
import { MapPin, Phone, MessageCircle, Heart, MessageSquare, Eye, Send, Loader2, Star, ShieldCheck } from "lucide-react";

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [viewCount, setViewCount] = useState(0);

  // Rating state
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [canRate, setCanRate] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("vendors")
        .select(`*, schools(name, id), campus_locations(name), vendor_images(*)`)
        .eq("id", id)
        .single();

      if (data) {
        setVendor(data);
        setImages(data.vendor_images || []);
        const primary = data.vendor_images?.find((img: any) => img.is_primary);
        setSelectedImage(primary?.image_url || data.vendor_images?.[0]?.image_url || null);

        // Track view only once per session per vendor
        const viewKey = `vendor_viewed_${id}`;
        if (!sessionStorage.getItem(viewKey)) {
          await supabase.from("vendor_views").insert({
            vendor_id: id, viewer_id: user?.id || null, school_id: data.schools?.id || null,
          } as any);
          sessionStorage.setItem(viewKey, "1");
        }

        // Fetch engagement data
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
          const avg = allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length;
          setAvgRating(avg);
          const dist = [0, 0, 0, 0, 0];
          allRatings.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
          setRatingDistribution(dist);
        }

        if (user) {
          const userR = allRatings.find((r: any) => r.user_id === user.id);
          if (userR) {
            setUserRating(userR.rating);
            setUserReview(userR.review || "");
            setHasRated(true);
          }

          const { data: txn } = await supabase
            .from("transactions")
            .select("id")
            .eq("vendor_id", id)
            .eq("user_id", user.id)
            .eq("status", "completed")
            .limit(1);

          setCanRate(!!txn && txn.length > 0);
        }
      }
      setIsLoading(false);
    };
    fetchVendor();
  }, [id, user]);

  const requireAuth = (action: string) => {
    if (!user) {
      toast({ title: `Sign in to ${action}`, description: "Create an account to interact with businesses", variant: "destructive" });
      navigate("/signup");
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth("like")) return;
    if (liked) {
      await supabase.from("vendor_likes").delete().eq("vendor_id", id!).eq("user_id", user!.id);
      setLiked(false); setLikeCount((c) => c - 1);
    } else {
      await supabase.from("vendor_likes").insert({ vendor_id: id!, user_id: user!.id } as any);
      setLiked(true); setLikeCount((c) => c + 1);
    }
  };

  const submitComment = async () => {
    if (!requireAuth("comment")) return;
    if (!commentText.trim()) return;
    const { data, error } = await supabase
      .from("vendor_comments")
      .insert({ vendor_id: id!, user_id: user!.id, content: commentText.trim() } as any)
      .select("*, profiles:user_id(first_name, last_name)")
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setComments((prev) => [data, ...prev]); setCommentText(""); }
  };

  const submitRating = async () => {
    if (!requireAuth("rate")) return;
    if (userRating === 0) return;
    if (!canRate) {
      toast({ title: "Cannot rate yet", description: "You can only rate after completing a transaction with this vendor.", variant: "destructive" });
      return;
    }

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
      setAvgRating(data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length);
      const dist = [0, 0, 0, 0, 0];
      data.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
      setRatingDistribution(dist);
    }
  };

  const trackContact = async (type: string) => {
    await supabase.from("vendor_contacts").insert({
      vendor_id: id!, contact_type: type, school_id: vendor?.schools?.id || null,
    } as any);
  };

  if (isLoading) {
    return (<div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center items-center pt-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>);
  }

  if (!vendor) {
    return (<div className="min-h-screen bg-background"><Navbar /><div className="text-center pt-32"><h2 className="text-xl font-semibold">Vendor not found</h2></div></div>);
  }

  const totalRatings = ratings.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div>
              <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-4">
                {selectedImage ? (
                  <img src={selectedImage} alt={vendor.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🏪</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img: any) => (
                    <button key={img.id} onClick={() => setSelectedImage(img.image_url)}
                      className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${selectedImage === img.image_url ? "border-accent" : "border-transparent"}`}>
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Engagement Bar */}
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

            {/* Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-12 w-12 border-2 border-accent">
                  {selectedImage ? <AvatarImage src={selectedImage} alt={vendor.business_name} /> : null}
                  <AvatarFallback className="bg-accent/10 text-accent">{vendor.business_name?.charAt(0) || "V"}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{vendor.business_name}</h1>
                {vendor.is_verified && (
                  <Badge className="bg-primary/10 text-primary text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{vendor.category}</Badge>
                {vendor.schools?.name && <Badge variant="outline">🎓 {vendor.schools.name}</Badge>}
                {vendor.campus_locations?.name && (
                  <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{vendor.campus_locations.name}</Badge>
                )}
              </div>
              {vendor.description && <p className="text-muted-foreground mb-6">{vendor.description}</p>}

              {/* Amazon-style Rating Breakdown */}
              <Card className="border-border/50 mb-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Customer Ratings</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 justify-center my-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">{totalRatings} rating{totalRatings !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
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

                  {/* Leave a rating (only if has completed transaction) */}
                  {user && canRate && (
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {hasRated ? "Update your rating" : "Rate your experience"}
                      </p>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
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
                      💡 You can rate this vendor after completing a transaction with them.
                    </p>
                  )}
                  {!user && (
                    <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                      Sign in and complete a transaction to leave a rating.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="border-border/50 mb-4">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Contact</h3>
                  {vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => trackContact("call")} asChild>
                      <a href={`tel:${vendor.contact_number}`}><Phone className="h-4 w-4 mr-2" />{vendor.contact_number}</a>
                    </Button>
                  )}
                  {vendor.messaging_enabled && vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => trackContact("whatsapp")} asChild>
                      <a href={`https://wa.me/${vendor.contact_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2" />Message on WhatsApp
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Comments */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Comments ({comments.length})</h3>
                  <div className="flex gap-2 mb-4">
                    <Input placeholder={user ? "Write a comment..." : "Sign in to comment"} value={commentText}
                      onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment()} className="h-9 text-sm" />
                    <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                    ) : (
                      comments.map((c: any) => (
                        <div key={c.id} className="border-b border-border/30 pb-2 last:border-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {(c.profiles as any)?.first_name || "User"} {(c.profiles as any)?.last_name || ""}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VendorProfile;
