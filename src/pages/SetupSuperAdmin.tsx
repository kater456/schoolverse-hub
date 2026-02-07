import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Shield, Loader2, CheckCircle, ArrowRight } from "lucide-react";

const SetupSuperAdmin = () => {
  const { user, session, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasExistingAdmin, setHasExistingAdmin] = useState(false);

  useEffect(() => {
    // Check if super admin already exists
    const checkExistingAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "super_admin")
        .limit(1);

      if (data && data.length > 0) {
        setHasExistingAdmin(true);
      }
    };

    checkExistingAdmin();
  }, []);

  const handleSetupAdmin = async () => {
    if (!session?.access_token) {
      toast({
        title: "Not logged in",
        description: "Please sign up or log in first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("setup-super-admin", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setIsComplete(true);
        toast({
          title: "Success!",
          description: "You are now the super admin.",
        });
      } else {
        throw new Error(response.data?.message || "Setup failed");
      }
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Super Admin Setup</CardTitle>
          <CardDescription>
            {hasExistingAdmin
              ? "A super admin already exists for this platform."
              : "Set up the first super admin account for EduMarket."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasExistingAdmin ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Contact the existing admin for access, or log in if you already have admin privileges.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          ) : isComplete ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                You're all set!
              </p>
              <p className="text-muted-foreground">
                You now have full super admin access to manage the platform.
              </p>
              <Button onClick={() => navigate("/super-admin")} className="w-full">
                Go to Super Admin Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                First, create an account or log in to become the super admin.
              </p>
              <div className="grid gap-3">
                <Button asChild variant="hero" className="w-full">
                  <Link to="/signup">Create Account</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Log In</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Logged in as:</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
              <Button
                onClick={handleSetupAdmin}
                variant="hero"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Make Me Super Admin
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This action can only be performed once. The first user to complete
                this setup becomes the platform super admin.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupSuperAdmin;
