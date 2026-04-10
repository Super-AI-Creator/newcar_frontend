import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { getArticles } from "@/lib/articles";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://newcarsuperstore.com");

const APP_DIR = path.join(process.cwd(), "src", "app");
const ROUTE_PRIORITY: Record<string, number> = {
  "": 1,
  articles: 0.9,
  "articles/[slug]": 0.7,
  "lease-specials": 0.9,
  search: 0.8,
  reviews: 0.8,
  testimonials: 0.8,
  "credit-application": 0.7,
  "most-reviewed-auto-broker-los-angeles": 0.7,
  privacy: 0.6,
  login: 0.5,
  register: 0.5,
};
const ROUTE_CHANGE_FREQUENCY: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
  "": "weekly",
  articles: "weekly",
  "articles/[slug]": "monthly",
  "lease-specials": "daily",
  search: "weekly",
  reviews: "monthly",
  testimonials: "monthly",
  "credit-application": "monthly",
  "most-reviewed-auto-broker-los-angeles": "monthly",
  privacy: "yearly",
  login: "monthly",
  register: "monthly",
};
const EXCLUDED_SEGMENTS = new Set(["(protected)", "admin"]);

function normalizeDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function discoverPublicStaticRoutes(baseDir: string): string[] {
  const routes = new Set<string>();
  if (!fs.existsSync(baseDir)) return [];

  function walk(currentDir: string, segments: string[]) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, [...segments, entry.name]);
        continue;
      }
      if (!entry.isFile() || entry.name !== "page.tsx") continue;
      const routeSegments = segments.filter((segment) => segment !== "");
      if (routeSegments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) continue;
      if (routeSegments.some((segment) => segment.startsWith("[") && segment.endsWith("]"))) continue;
      const cleanSegments = routeSegments.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
      const routePath = cleanSegments.join("/");
      routes.add(routePath);
    }
  }

  walk(baseDir, []);
  return Array.from(routes).sort();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  const staticRoutes = discoverPublicStaticRoutes(APP_DIR);
  for (const routePath of staticRoutes) {
    const url = routePath ? `${BASE_URL}/${routePath}` : BASE_URL;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    entries.push({
      url,
      lastModified: now,
      changeFrequency: ROUTE_CHANGE_FREQUENCY[routePath] ?? "monthly",
      priority: ROUTE_PRIORITY[routePath] ?? 0.6,
    });
  }

  const articles = getArticles();
  for (const article of articles) {
    const url = `${BASE_URL}/articles/${article.slug}`;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    entries.push({
      url,
      lastModified: normalizeDate(article.date),
      changeFrequency: ROUTE_CHANGE_FREQUENCY["articles/[slug]"] ?? "monthly",
      priority: ROUTE_PRIORITY["articles/[slug]"] ?? 0.7,
    });
  }

  // Ensure important marketing/search pages are always present even if files move.
  const importantRoutes = [
    "",
    "search",
    "lease-specials",
    "articles",
    "reviews",
    "testimonials",
    "credit-application",
    "most-reviewed-auto-broker-los-angeles",
    "privacy",
  ];
  for (const routePath of importantRoutes) {
    const url = routePath ? `${BASE_URL}/${routePath}` : BASE_URL;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    entries.push({
      url,
    lastModified: now,
      changeFrequency: ROUTE_CHANGE_FREQUENCY[routePath] ?? "monthly",
      priority: ROUTE_PRIORITY[routePath] ?? 0.6,
    });
  }

  return entries;
}
