import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { safeSessionStorage } from "@/lib/safeStorage";
import { GraduationCap, Mail, ArrowRight, Loader2, CheckCircle2, Edit2, Check } from "lucide-react";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const queryEmail = searchParams.get("email");
  const stateEmail = location.state?.email;

  // Cascading fallback to resolve and persist email state
  const [email, setEmail] = useState(() => {
    const initial = stateEmail || queryEmail || safeSessionStorage.getItem("verify_email_temp") || "";
    return initial;
  });

  const [isEditingEmail, setIsEditingEmail] = useState(!email);
  const [tempEmail, setTempEmail] = useState(email);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Synchronize and persist email to sessionStorage
  useEffect(() => {
    if (email) {
      safeSessionStorage.setItem("verify_email_temp", email);
      setTempEmail(email);
    }
  }, [email]);

  // Listen for Supabase session changes (e.g. if the email confirmation link was clicked in another tab or redirects)
  useEffect(() => {
    let isSubscribed = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at && isSubscribed) {
          console.log("Verified session detected via getSession, auto-redirecting.");
          await handleAutoVerify();
        }
      } catch (err) {
        console.error("Error checking session", err);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email_confirmed_at && isSubscribed) {
        console.log(`Verified session detected on event ${event}, auto-redirecting.`);
        await handleAutoVerify();
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAutoVerify = async () => {
    setIsVerified(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out during auto-verify failed", e);
    }
    toast({
      title: "Email verified automatically!",
      description: "We detected your email is confirmed. Redirecting to login...",
    });

    setTimeout(() => {
      navigate("/login", { state: { verified: true } });
    }, 2500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSaveEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tempEmail || !emailRegex.test(tempEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setEmail(tempEmail);
    setIsEditingEmail(false);
    toast({
      title: "Email updated",
      description: `Verification email set to ${tempEmail}.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      toast({ title: "Invalid code", description: "Please enter the complete 6-digit code.", variant: "destructive" });
      return;
    }

    if (!email) {
      toast({ title: "Email required", description: "Please enter your email to complete verification.", variant: "destructive" });
      setIsEditingEmail(true);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Verifying code for email: ${email} with custom verification function`);
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email, code },
      });
      setIsLoading(false);

      if (error) {
        toast({ title: "Verification failed", description: error.message || "Invalid code", variant: "destructive" });
        return;
      }

      // Sign out so user must login fresh
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Sign out failed on verification submit:", err);
      }
      setIsVerified(true);
      toast({ title: "Email verified!", description: "Your email has been verified. Please proceed to login." });

      setTimeout(() => {
        navigate("/login", { state: { verified: true } });
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      toast({ title: "Error", description: err.message || "Verification failed", variant: "destructive" });
    }
  };

  const handleResend = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: "Invalid email format",
        description: "Please specify a valid email address before resending.",
        variant: "destructive",
      });
      setIsEditingEmail(true);
      return;
    }

    console.log("Calling send-verification-code with:", email);
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { email },
      });
      setIsResending(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Code resent", description: "A new verification code has been sent to your email." });
      }
    } catch (err: any) {
      setIsResending(false);
      toast({ title: "Error", description: err.message || "Failed to resend code", variant: "destructive" });
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="text-center max-w-md animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-6">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            Email Verified!
          </h1>
          <p className="text-muted-foreground mb-4">
            Your email has been successfully verified.
          </p>
          <p className="text-sm font-medium text-primary">
            Redirecting you to login...
          </p>
          <div className="flex justify-center mt-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline font-semibold">
            Proceed to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Campus Market</span>
        </Link>

        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Verify your email
          </h1>

          <div className="flex flex-col items-center justify-center gap-2 mb-3">
            {isEditingEmail ? (
              <div className="flex items-center gap-2 w-full max-w-xs mt-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="h-10"
                />
                <Button size="sm" type="button" onClick={handleSaveEmail} className="h-10 px-3">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                A verification code has been sent to{" "}
                <span className="font-medium text-foreground">{email}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="p-1 text-primary hover:text-primary/80 transition-colors"
                  title="Edit email"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </p>
            )}
          </div>

          <p className="text-sm text-primary font-medium">
            📧 Please check your email inbox (and spam folder) for the 6-digit code, then enter it below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold"
              />
            ))}
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</>
            ) : (
              <>Verify Email <ArrowRight className="h-5 w-5" /></>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {isResending ? "Resending..." : "Resend"}
            </button>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to signup
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
