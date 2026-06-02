import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://www.campusmarketapp.com";

interface StaticEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

const STATIC_URLS: StaticEntry[] = [
  { loc: `${BASE_URL}/`,       changefreq: "daily",   priority: "1.0" },
  { loc: `${BASE_URL}/browse`, changefreq: "daily",   priority: "0.9" },
  { loc: `${BASE_URL}/reels`,  changefreq: "hourly",  priority: "0.8" },
  { loc: `${BASE_URL}/auth`,   changefreq: "monthly", priority: "0.5" },
];

const buildXml = (entries: StaticEntry[]): string => {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

export const generateSitemap = async (): Promise<string> => {
  try {
    const { data, error } = await (supabase as any)
      .from("stores")
      .select("id, store_name")
      .eq("is_active", true);

    if (error) {
      console.error("[generateSitemap] failed to fetch stores:", error);
      return buildXml(STATIC_URLS);
    }

    const dynamic: StaticEntry[] = (data ?? []).map((s: { id: string }) => ({
      loc: `${BASE_URL}/store/${s.id}`,
      changefreq: "weekly",
      priority: "0.7",
    }));

    return buildXml([...STATIC_URLS, ...dynamic]);
  } catch (err) {
    console.error("[generateSitemap] unexpected error:", err);
    return buildXml(STATIC_URLS);
  }
};

export const logGeneratedSitemap = async (): Promise<void> => {
  const xml = await generateSitemap();
  console.log(xml);
};
