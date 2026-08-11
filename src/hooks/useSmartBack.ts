import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Step-by-step back navigation.
 * Goes back one entry in history when the user arrived from inside the app,
 * otherwise falls back to a sensible route (deep links / new tabs).
 */
export function useSmartBack(fallback = "/browse") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const idx = (location as any).key && window.history.state?.idx;
    if (typeof idx === "number" ? idx > 0 : window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, location, fallback]);
}
