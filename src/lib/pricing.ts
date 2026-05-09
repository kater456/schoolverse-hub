// ─────────────────────────────────────────────────────────────────────────────
// Multi-currency pricing for Paystack across Africa.
// Funds for ALL currencies settle into the same Paystack merchant wallet.
// Country auto-detected via IP and cached in localStorage.
// ─────────────────────────────────────────────────────────────────────────────

export type Currency = "NGN" | "GHS" | "KES" | "ZAR";
export type PlanKey =
  | "registration"
  | "store_upgrade"
  | "verification"
  | "featured_top_listing"
  | "featured_top_listing_reels";

interface PriceRow {
  amount: number;       // major units (₦, GH₵, KES, R)
  display: string;      // user-facing label
}

// Subunit conversion (×100 for all four)
const SUBUNIT_MULTIPLIER = 100;

// Channels supported per currency on Paystack
const CHANNELS: Record<Currency, string[]> = {
  NGN: ["card", "bank_transfer", "ussd", "bank", "mobile_money", "qr"],
  GHS: ["card", "mobile_money"],
  KES: ["card", "mobile_money"],
  ZAR: ["card"],
};

// Price table — equivalent local pricing per plan
const PRICES: Record<PlanKey, Record<Currency, PriceRow>> = {
  registration: {
    NGN: { amount: 1200, display: "₦1,200" },
    GHS: { amount: 12,   display: "GH₵12"   },
    KES: { amount: 100,  display: "KES 100" },
    ZAR: { amount: 15,   display: "R15"     },
  },
  store_upgrade: {
    NGN: { amount: 2000, display: "₦2,000" },
    GHS: { amount: 20,   display: "GH₵20"  },
    KES: { amount: 170,  display: "KES 170"},
    ZAR: { amount: 25,   display: "R25"    },
  },
  verification: {
    NGN: { amount: 1500, display: "₦1,500" },
    GHS: { amount: 15,   display: "GH₵15"  },
    KES: { amount: 130,  display: "KES 130"},
    ZAR: { amount: 18,   display: "R18"    },
  },
  featured_top_listing: {
    NGN: { amount: 1000, display: "₦1,000" },
    GHS: { amount: 10,   display: "GH₵10"  },
    KES: { amount: 85,   display: "KES 85" },
    ZAR: { amount: 12,   display: "R12"    },
  },
  featured_top_listing_reels: {
    NGN: { amount: 2000, display: "₦2,000" },
    GHS: { amount: 20,   display: "GH₵20"  },
    KES: { amount: 170,  display: "KES 170"},
    ZAR: { amount: 25,   display: "R25"    },
  },
};

// Country → currency mapping
const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
};

const CACHE_KEY = "cm_user_currency_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let inflight: Promise<Currency> | null = null;

/** Detect user's currency via IP geolocation. Cached. Falls back to NGN. */
export async function detectCurrency(): Promise<Currency> {
  // Cached?
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { currency, ts } = JSON.parse(raw);
      if (currency && Date.now() - ts < CACHE_TTL_MS) return currency as Currency;
    }
  } catch { /* ignore */ }

  if (inflight) return inflight;

  inflight = (async (): Promise<Currency> => {
    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3500) });
      if (!res.ok) throw new Error("ip lookup failed");
      const data = await res.json();
      const cc = (data.country_code || data.country || "NG").toUpperCase();
      const currency = COUNTRY_TO_CURRENCY[cc] || "NGN";
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ currency, ts: Date.now() }));
      } catch { /* ignore */ }
      return currency;
    } catch {
      return "NGN";
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export interface ResolvedPlan {
  plan: PlanKey;
  currency: Currency;
  amount: number;          // major units
  amountSubunits: number;  // for Paystack `amount` field
  display: string;
  channels: string[];
}

/** Resolve a plan price for the user's currency (auto-detected). */
export async function resolvePlan(plan: PlanKey): Promise<ResolvedPlan> {
  const currency = await detectCurrency();
  const row = PRICES[plan][currency];
  return {
    plan,
    currency,
    amount: row.amount,
    amountSubunits: Math.round(row.amount * SUBUNIT_MULTIPLIER),
    display: row.display,
    channels: CHANNELS[currency],
  };
}

/** Synchronous lookup once currency is known (e.g. from useCurrency hook). */
export function getPlan(plan: PlanKey, currency: Currency): ResolvedPlan {
  const row = PRICES[plan][currency];
  return {
    plan,
    currency,
    amount: row.amount,
    amountSubunits: Math.round(row.amount * SUBUNIT_MULTIPLIER),
    display: row.display,
    channels: CHANNELS[currency],
  };
}
