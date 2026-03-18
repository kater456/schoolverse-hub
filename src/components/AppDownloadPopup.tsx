import { useState, useEffect } from "react";
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
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("app-popup-dismissed");
    if (dismissed) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show popup anyway after delay even without prompt event
    const fallback = setTimeout(() => setVisible(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallback);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("app-popup-dismissed", "true");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        dismiss();
      }
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-xs animate-slide-up">
      <div className="bg-card border border-border rounded-xl shadow-xl p-4 relative">
        <button
          onClick={dismiss}
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
