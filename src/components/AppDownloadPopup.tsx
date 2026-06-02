import { useState, useEffect, useRef } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const AppDownloadPopup = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const timeElapsed = useRef(false);
  const scrolledEnough = useRef(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("app-popup-dismissed");
    if (dismissed) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const checkBothConditions = () => {
      if (timeElapsed.current && scrolledEnough.current) {
        setShowBanner(true);
      }
    };

    const timer = window.setTimeout(() => {
      timeElapsed.current = true;
      checkBothConditions();
    }, 30000);

    const onScroll = () => {
      if (window.scrollY >= 300) {
        scrolledEnough.current = true;
        checkBothConditions();
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("app-popup-dismissed", "true");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
      setDeferredPrompt(null);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full p-3 animate-slide-up">
      <div className="max-w-md mx-auto bg-card border border-border rounded-xl shadow-xl p-4 relative">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Get the Campus Market App
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {isIOS
                ? "Tap the share button, then 'Add to Home Screen' to install."
                : "Install our app for a better campus marketplace experience."}
            </p>
            {deferredPrompt ? (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8" onClick={handleInstall}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Install App
              </Button>
            ) : isIOS ? (
              <p className="text-xs text-accent font-medium">Use Safari Share → Add to Home Screen</p>
            ) : (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8" onClick={dismiss}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadPopup;
