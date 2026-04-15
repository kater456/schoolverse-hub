import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, Trash2, Info, Star, ShieldCheck, AlertCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source: 'user' | 'vendor';
};

const NotificationCenter = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch user notifications
      const { data: userNotifs, error: userError } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (userError) throw userError;

      // Fetch vendor notifications if user is a vendor
      let vendorNotifs: any[] = [];
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (vendorData) {
        const { data: vNotifs, error: vError } = await supabase
          .from("vendor_notifications")
          .select("*")
          .eq("vendor_id", vendorData.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (vError) throw vError;
        vendorNotifs = vNotifs || [];
      }

      const combined: Notification[] = [
        ...(userNotifs || []).map(n => ({ ...n, source: 'user' as const })),
        ...(vendorNotifs || []).map(n => ({ ...n, source: 'vendor' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);

      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error("Error fetching notifications:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to real-time updates
      const userChannel = supabase
        .channel("user-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
          () => fetchNotifications()
        )
        .subscribe();

      const vendorChannel = supabase.channel("vendor-notifications-sub");

      const setupVendorSub = async () => {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (vendorData) {
          vendorChannel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "vendor_notifications", filter: `vendor_id=eq.${vendorData.id}` },
            () => fetchNotifications()
          ).subscribe();
        }
      };

      setupVendorSub();

      return () => {
        supabase.removeChannel(userChannel);
        supabase.removeChannel(vendorChannel);
      };
    }
  }, [user]);

  const markAsRead = async (id: string, source: 'user' | 'vendor') => {
    const table = source === 'user' ? 'user_notifications' : 'vendor_notifications';
    const { error } = await supabase
      .from(table as any)
      .update({ is_read: true } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;

    const userIds = unread.filter(n => n.source === 'user').map(n => n.id);
    const vendorIds = unread.filter(n => n.source === 'vendor').map(n => n.id);

    try {
      if (userIds.length > 0) {
        await supabase.from("user_notifications").update({ is_read: true } as any).in("id", userIds);
      }
      if (vendorIds.length > 0) {
        await supabase.from("vendor_notifications").update({ is_read: true } as any).in("id", vendorIds);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast({ title: "All caught up!", description: "All notifications marked as read." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteNotification = async (id: string, source: 'user' | 'vendor') => {
    const table = source === 'user' ? 'user_notifications' : 'vendor_notifications';
    const { error } = await supabase
      .from(table as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notifications.find(n => n.id === id)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast({ title: "Deleted", description: "Notification removed." });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approval": return <ShieldCheck className="h-4 w-4 text-success" />;
      case "featured": return <Star className="h-4 w-4 text-yellow-500" />;
      case "store_upgrade": return <Star className="h-4 w-4 text-accent" />;
      case "like": return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "comment": return <AlertCircle className="h-4 w-4 text-accent" />;
      case "order": return <ShoppingBag className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground border-2 border-background animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-accent hover:text-accent" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <Bell className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications at the moment.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-1 p-4 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30 ${!n.is_read ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${!n.is_read ? 'bg-accent/10' : 'bg-muted'}`}>
                        {getIcon(n.type)}
                      </div>
                      <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                        {n.source === 'vendor' ? 'Store' : 'Update'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <h5 className={`text-sm font-semibold leading-none ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </h5>
                    {n.message && (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {n.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] hover:bg-accent/10 hover:text-accent"
                        onClick={() => markAsRead(n.id, n.source)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      onClick={() => deleteNotification(n.id, n.source)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground h-8" asChild>
            <Link to={userRole?.role === 'vendor' ? '/vendor-dashboard' : '/messages'}>
              View all activity
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
