import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { getArticles } from "@/lib/articles";
import { env } from "@/lib/env";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://newcarsuperstore.com");

/** Regenerate sitemap periodically so inventory + new pages are not stuck at deploy time. */
export const revalidate = 3600;

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

function normalizeDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Strip Next route groups like `(protected)`; omit admin/dashboard and dynamic segments. */
function shouldOmitDiscoverableRoute(cleanSegments: string[]): boolean {
  if (cleanSegments.some((s) => s.startsWith("[") && s.endsWith("]"))) return true;
  if (cleanSegments.includes("admin")) return true;
  if (cleanSegments[0] === "dashboard") return true;
  return false;
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
      const cleanSegments = routeSegments.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
      if (shouldOmitDiscoverableRoute(cleanSegments)) continue;
      const routePath = cleanSegments.join("/");
      routes.add(routePath);
    }
  }

  walk(baseDir, []);
  return Array.from(routes).sort();
}

/** Vercel/Next static generation defaults to ~60s; keep inventory work well under that. */
const INVENTORY_FETCH_BUDGET_MS = 22_000;
const INVENTORY_PAGE_TIMEOUT_MS = 4_000;
const INVENTORY_PAGE_SIZE = 500;
const INVENTORY_MAX_PAGES = 40;

async function fetchInventoryVehicleEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const apiBase = (env.apiBaseUrl || "").trim().replace(/\/$/, "");
  if (!apiBase) return [];

  const out: MetadataRoute.Sitemap = [];
  const seenVins = new Set<string>();
  const started = Date.now();

  for (let page = 1; page <= INVENTORY_MAX_PAGES; page++) {
    if (Date.now() - started > INVENTORY_FETCH_BUDGET_MS) break;

    const qs = new URLSearchParams({
      vehicle_type: "all",
      page: String(page),
      page_size: String(INVENTORY_PAGE_SIZE)
    });
    const url = `${apiBase}/inventory/search?${qs.toString()}`;

    let res: Response;
    try {
      const signal =
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(INVENTORY_PAGE_TIMEOUT_MS)
          : undefined;
      res = await fetch(url, { next: { revalidate: 3600 }, ...(signal ? { signal } : {}) });
    } catch {
      break;
    }
    if (!res.ok) break;
    let data: { items?: unknown[]; results?: unknown[]; total?: number };
    try {
      data = (await res.json()) as { items?: unknown[]; results?: unknown[]; total?: number };
    } catch {
      break;
    }
    const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(data.results) ? data.results : [];
    if (rawItems.length === 0) break;

    for (const row of rawItems) {
      const item = row as { vin?: string };
      const vin = typeof item?.vin === "string" ? item.vin.trim().toUpperCase() : "";
      if (!vin || seenVins.has(vin)) continue;
      seenVins.add(vin);
      out.push({
        url: `${baseUrl}/vehicles/${encodeURIComponent(vin)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.65
      });
    }

    if (rawItems.length < INVENTORY_PAGE_SIZE) break;
  }

  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      priority: ROUTE_PRIORITY[routePath] ?? 0.6
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
      priority: ROUTE_PRIORITY["articles/[slug]"] ?? 0.7
    });
  }

  const importantRoutes = [
    "",
    "search",
    "lease-specials",
    "articles",
    "reviews",
    "testimonials",
    "credit-application",
    "most-reviewed-auto-broker-los-angeles",
    "privacy"
  ];
  for (const routePath of importantRoutes) {
    const url = routePath ? `${BASE_URL}/${routePath}` : BASE_URL;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    entries.push({
      url,
      lastModified: now,
      changeFrequency: ROUTE_CHANGE_FREQUENCY[routePath] ?? "monthly",
      priority: ROUTE_PRIORITY[routePath] ?? 0.6
    });
  }

  const vehicleEntries = await fetchInventoryVehicleEntries(BASE_URL);
  for (const row of vehicleEntries) {
    if (!row.url || seenUrls.has(row.url)) continue;
    seenUrls.add(row.url);
    entries.push(row);
  }

  return entries;
}
