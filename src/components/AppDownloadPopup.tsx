import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppDownloadPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("app-popup-dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("app-popup-dismissed", "true");
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
              Get the EduMarket App
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Download our app for a better campus marketplace experience.
            </p>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadPopup;
