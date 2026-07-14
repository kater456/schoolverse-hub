import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Eye, EyeOff, ArrowRight, Loader2, Check, X } from "lucide-react";

// ── Inline Google icon ───────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Real-time password validation checks
  const passwordRules = {
    length: formData.password.length >= 8,
    number: /\d/.test(formData.password),
    specialChar: /[!@#$%^&*(),.?":{}|<>_]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // ── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
      // Supabase redirects — no navigate() needed
    } catch (err: any) {
      toast({ title: "Google sign-up failed", description: err.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  // ── Email / Password ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: "Weak password",
        description: "Please satisfy all password requirements: at least 8 characters, 1 number, 1 uppercase letter, and 1 special character.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Signing up user with email: ${formData.email}`);
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: { first_name: formData.firstName, last_name: formData.lastName },
        },
      });

      setIsLoading(false);

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        toast({ title: "Account already exists", description: "This email is already registered. Please sign in.", variant: "destructive" });
        navigate("/login");
        return;
      }

      toast({
        title: "Verification code sent!",
        description: "A 6-digit code has been sent to your email. Please check your inbox.",
      });
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (err: any) {
      setIsLoading(false);
      toast({ title: "Sign up failed", description: err.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Campus Market</span>
          </Link>

          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Create your account</h1>
            <p className="text-muted-foreground">Join the campus marketplace — buy, sell, and connect.</p>
          </div>

          {/* ── Google sign-up button ── */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 flex items-center gap-3 mb-4 font-medium"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required className="h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password"
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required className="h-12 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Proactive password requirements checklist */}
              <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 border border-border mt-1">
                <p className="text-xs font-semibold text-muted-foreground">Password requirements:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    {passwordRules.length ? (
                      <Check className="h-3.5 w-3.5 text-success font-bold" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={passwordRules.length ? "text-success font-medium" : "text-muted-foreground"}>Min. 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordRules.uppercase ? (
                      <Check className="h-3.5 w-3.5 text-success font-bold" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={passwordRules.uppercase ? "text-success font-medium" : "text-muted-foreground"}>At least 1 uppercase</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordRules.number ? (
                      <Check className="h-3.5 w-3.5 text-success font-bold" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={passwordRules.number ? "text-success font-medium" : "text-muted-foreground"}>At least 1 number</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordRules.specialChar ? (
                      <Check className="h-3.5 w-3.5 text-success font-bold" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={passwordRules.specialChar ? "text-success font-medium" : "text-muted-foreground"}>At least 1 special char</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password"
                  value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required className="h-12 pr-12" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Creating account...</>) : (<>Create Account <ArrowRight className="h-5 w-5" /></>)}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">Terms of Service</a> and{" "}
            <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-bold text-primary-foreground mb-6">Join Campus Entrepreneurs on Campus Market</h2>
            <p className="text-primary-foreground/70 text-lg mb-8">Create your account in minutes. List your business, reach students, and grow your campus hustle.</p>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
              <p className="text-primary-foreground/90 italic mb-4">"Campus Market transformed how we manage our school store. Sales are up 40% and parents love the convenience."</p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-primary-foreground">Sarah Johnson</div>
                  <div className="text-xs text-primary-foreground/60">Principal, Lincoln Academy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
