import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scrolls to top on forward route changes.
 * Skips POP (browser/app back) so the previous screen's scroll position
 * can be restored by the page itself.
 */
const ScrollManager = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === "POP") return;
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
    return () => clearTimeout(t);
  }, [pathname, navType]);

  return null;
};

export default ScrollManager;
