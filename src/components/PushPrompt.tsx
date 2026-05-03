import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensurePushRegistered, isPushSupported } from "@/lib/push";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "push_prompt_dismissed_at";

const PushPrompt = () => {
  const { toast } = useToast();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission === "granted") {
      // Make sure subscription exists & is saved
      ensurePushRegistered();
      return;
    }
    if (Notification.permission === "denied") return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24 * 7) return;
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    const ok = await ensurePushRegistered();
    setShow(false);
    if (ok) toast({ title: "Notifications enabled 🔔", description: "You'll get alerts for new vendors, deals & updates." });
    else toast({ title: "Notifications blocked", description: "You can enable them later from your browser settings.", variant: "destructive" });
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[100] bg-card border rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-lg"><Bell className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Stay in the loop</p>
          <p className="text-xs text-muted-foreground mt-1">Get push alerts for new vendors, deals & updates — even when the app is closed.</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={enable}>Enable</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default PushPrompt;
