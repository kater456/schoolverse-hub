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
      setItem:    (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} },
      removeItem: (key: string) => { try { localStorage.removeItem(key); } catch {} },
      clear:      () => { try { localStorage.clear(); } catch {} },
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
      setItem:    (key: string, value: string) => { try { sessionStorage.setItem(key, value); } catch {} },
      removeItem: (key: string) => { try { sessionStorage.removeItem(key); } catch {} },
      clear:      () => { try { sessionStorage.clear(); } catch {} },
    };
  } catch {
    return makeMemoryStorage(memSession);
  }
})();

export const isRealtimeSafe = (): boolean => {
  try {
    sessionStorage.setItem("__cm_ws_test__", "1");
    sessionStorage.removeItem("__cm_ws_test__");
    return true;
  } catch {
    return false;
  }
};
