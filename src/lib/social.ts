/**
 * Social handle helpers — accept either a full URL or a bare handle
 * ("@myshop" / "myshop") and normalize to a full profile URL.
 */

const clean = (raw: string) =>
  raw.trim().replace(/^@+/, "").replace(/\/+$/, "");

function normalize(raw: string | null | undefined, base: string, prefix = ""): string | null {
  if (!raw) return null;
  const value = clean(raw);
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(value)) return `https://${value}`;
  return `${base}${prefix}${value}`;
}

export const normalizeInstagram = (raw?: string | null) =>
  normalize(raw, "https://instagram.com/");

export const normalizeTiktok = (raw?: string | null) =>
  normalize(raw, "https://tiktok.com/", "@");

export const normalizeTwitter = (raw?: string | null) =>
  normalize(raw, "https://x.com/");
