import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Smoothly scrolls to top on every route pathname change.
 * Works alongside browser scrollRestoration='manual' set in main.tsx.
 */
const ScrollManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
};

export default ScrollManager;
