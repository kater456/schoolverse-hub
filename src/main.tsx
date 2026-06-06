import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { evictLegacyWorker } from "@/lib/push";

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// Evict any legacy Workbox service worker from previous deploys.
// This unblocks iOS Safari users who had two SWs registered on /.
if (typeof window !== "undefined") {
  evictLegacyWorker();
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <App />
  </ThemeProvider>
);
