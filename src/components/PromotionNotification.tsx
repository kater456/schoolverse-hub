import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Award } from "lucide-react";

const PromotionNotification = () => {
  const { user, userRole } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !userRole) return;
    
    const role = userRole.role;
    if ((role === "sub_admin" || role === "admin") && !(userRole as any).promotion_notified) {
      // Not yet notified — show popup
      setShow(true);

      // Mark as notified
      supabase
        .from("user_roles")
        .update({ promotion_notified: true } as any)
        .eq("id", userRole.id)
        .then();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user, userRole]);

  if (!show) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-accent text-accent-foreground px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 max-w-md">
        <Award className="h-8 w-8 flex-shrink-0" />
        <div>
          <p className="font-bold text-sm">Congratulations! 🎉</p>
          <p className="text-xs opacity-90">You have been promoted to {userRole?.role === "admin" ? "Admin" : "Sub-Admin"}.</p>
        </div>
      </div>
    </div>
  );
};

export default PromotionNotification;
