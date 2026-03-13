import type { MetadataRoute } from "next";
import { getAllArticleSlugsForSitemap } from "@/lib/articles";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://newcarsuperstore.com";

const STATIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "articles", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "reviews", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "lease-specials", priority: 0.9, changeFrequency: "daily" as const },
  { path: "search", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "login", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "register", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "credit-application", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "most-reviewed-auto-broker-los-angeles", priority: 0.7, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${BASE_URL}/${path}` : BASE_URL,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const articleSlugs = getAllArticleSlugsForSitemap();
  for (const slug of articleSlugs) {
    entries.push({
      url: `${BASE_URL}/articles/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
