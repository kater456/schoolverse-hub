// ─────────────────────────────────────────────────────────────────────────────
// Paystack helpers — LIVE key + reliable script loader.
// The public key is publishable, so it is safe in client code.
// ─────────────────────────────────────────────────────────────────────────────

const LIVE_PUBLIC_KEY = "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5";

/** Always resolves to a live Paystack public key. */
export const getPaystackKey = (): string => {
  const env = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
  return env && env.startsWith("pk_live_") ? env : LIVE_PUBLIC_KEY;
};

const SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";
let loader: Promise<any> | null = null;

/**
 * Loads the Paystack inline script once and resolves with PaystackPop.
 * Prevents the "tap again in a moment" glitch.
 */
export const loadPaystack = (): Promise<any> => {
  if ((window as any).PaystackPop) return Promise.resolve((window as any).PaystackPop);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", () => resolve((window as any).PaystackPop), { once: true });
    script.addEventListener("error", () => { loader = null; reject(new Error("Could not load payment system")); }, { once: true });
    // Already-loaded edge case
    if ((window as any).PaystackPop) resolve((window as any).PaystackPop);
  });

  return loader;
};
