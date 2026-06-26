/**
 * safeStorage.ts
 *
 * iOS Safari in Private Browsing mode throws a SecurityError the moment
 * any code touches localStorage or sessionStorage — even a .getItem() call.
 * This crashes React before it can mount, producing a completely blank page.
 *
 * These helpers wrap every storage access in a try/catch and fall back to
 * an in-memory store so the app always renders correctly.
 */

const memLocal: Record<string, string> = {};
const memSession: Record<string, string> = {};

function makeMemoryStorage(store: Record<string, string>) {
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

export const safeLocalStorage = (() => {
  try {
    localStorage.setItem("__cm_test__", "1");
    localStorage.removeItem("__cm_test__");
    return {
      getItem:    (key: string) => { try { return localStorage.getItem(key); } catch { return null; } },
      setItem:    (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
      removeItem: (key: string) => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
      clear:      () => { try { localStorage.clear(); } catch { /* ignore */ } },
    };
  } catch {
    return makeMemoryStorage(memLocal);
  }
})();

export const safeSessionStorage = (() => {
  try {
    sessionStorage.setItem("__cm_test__", "1");
    sessionStorage.removeItem("__cm_test__");
    return {
      getItem:    (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } },
      setItem:    (key: string, value: string) => { try { sessionStorage.setItem(key, value); } catch { /* ignore */ } },
      removeItem: (key: string) => { try { sessionStorage.removeItem(key); } catch { /* ignore */ } },
      clear:      () => { try { sessionStorage.clear(); } catch { /* ignore */ } },
    };
  } catch {
    return makeMemoryStorage(memSession);
  }
})();
