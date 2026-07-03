import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { trackEvent as trackVendorEvent } from "@/lib/tracker";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface Props {
  vendorId: string;
  vendorUserId: string;
  productId?: string;
  variant?: "default" | "outline";
  className?: string;
  label?: string;
}

const ContactVendorButton = ({
  vendorId,
  vendorUserId,
  productId,
  variant = "default",
  className = "",
  label = "Message Vendor",
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    if (!user) {
      toast({ title: "Sign in to message vendors", variant: "destructive" });
      navigate("/login");
      return;
    }

    // Vendor can't message themselves
    if (user.id === vendorUserId) {
      toast({ title: "This is your own business", description: "You cannot message yourself." });
      return;
    }

    setLoading(true);
    trackVendorEvent(vendorId, 'inquiry_click', productId);

    // If it's a "Buy" or "Order" button, track order_started
    if (label.toLowerCase().includes('buy') || label.toLowerCase().includes('order')) {
      trackVendorEvent(vendorId, 'order_started', productId);
    }

    // Check if conversation already exists
    const { data: existing } = await (supabase as any)
      .from("conversations")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
      setLoading(false);
      return;
    }

    // Create new conversation
    const { data: conv, error } = await (supabase as any)
      .from("conversations")
      .insert({
        vendor_id: vendorId,
        buyer_id:  user.id,
        last_message: null,
        buyer_unread:  0,
        vendor_unread: 0,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Could not start conversation", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    trackVendorEvent(vendorId, 'message_sent', productId);
    navigate(`/chat/${conv.id}`);
    setLoading(false);
  };

  return (
    <Button
      variant={variant}
      onClick={handleContact}
      disabled={loading}
      className={className}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
        : <MessageCircle className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
};

export default ContactVendorButton;
