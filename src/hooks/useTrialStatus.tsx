import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TrialStatus {
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
  paymentConfirmed: boolean;
  isLoading: boolean;
}

export const useTrialStatus = (): TrialStatus => {
  const { user, profile, userRole } = useAuth();
  const [isTrialActive, setIsTrialActive] = useState(true);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user || !profile) {
        setIsLoading(false);
        return;
      }

      // Super admins bypass trial
      if (userRole?.role === "super_admin") {
        setIsTrialActive(true);
        setPaymentConfirmed(true);
        setIsLoading(false);
        return;
      }

      // Check school-level trial if user belongs to a school
      if (profile.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("trial_ends_at, payment_confirmed")
          .eq("id", profile.school_id)
          .single();

        if (school) {
          const ends = new Date(school.trial_ends_at);
          setTrialEndsAt(ends);
          setPaymentConfirmed(school.payment_confirmed ?? false);
          setIsTrialActive(school.payment_confirmed || ends > new Date());
          setIsLoading(false);
          return;
        }
      }

      // Fallback: check profile-level trial
      const trialEnd = profile.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : null;
      setTrialEndsAt(trialEnd);
      setIsTrialActive(trialEnd ? trialEnd > new Date() : true);
      setIsLoading(false);
    };

    checkTrialStatus();
  }, [user, profile, userRole]);

  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return { isTrialActive, trialEndsAt, daysRemaining, paymentConfirmed, isLoading };
};
