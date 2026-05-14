import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UserVerification from "@/components/user/UserVerification";
import { ShoppingBag, MessageCircle, ShieldCheck, LogOut, Loader2 } from "lucide-react";

const AccountPage = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, is_user_verified, user_verified_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">Sign in to access your account</p>
            <Button asChild><Link to="/login">Sign In</Link></Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user.email
    : user.email;
  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 px-4 max-w-2xl mx-auto space-y-5">

        {/* Profile header */}
        <div className="flex items-center gap-4 pt-4">
          <Avatar className="h-14 w-14 border-2 border-accent/40">
            <AvatarFallback className="bg-accent/10 text-accent font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
              {(profile as any)?.is_user_verified && (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> Verified Student
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/browse">
            <Card className="border-border/50 hover:border-accent/40 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-accent flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Browse</p>
                  <p className="text-xs text-muted-foreground">Explore vendors</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/messages">
            <Card className="border-border/50 hover:border-accent/40 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Messages</p>
                  <p className="text-xs text-muted-foreground">Your chats</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Verification section */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <UserVerification
            onVerified={() => {
              setProfile((p: any) => p ? { ...p, is_user_verified: false } : p);
              // Will refresh to pending state automatically
            }}
          />
        )}

        {/* Sign out */}
        <Card className="border-destructive/20">
          <CardContent className="pt-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/5 gap-2"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>

      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;
