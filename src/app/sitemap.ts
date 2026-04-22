import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { fetchPublicArticleSummaries, mergeArticleSummaries } from "@/lib/articles-api";
import { env } from "@/lib/env";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

/**
 * Sitemap shape aligned with SEO export (core marketing URLs + articles + testimonials).
 * Inventory `/vehicles/{vin}` is off by default; set `NEXT_PUBLIC_SITEMAP_INCLUDE_VEHICLE_PAGES=true` to restore.
 */
export const revalidate = 3600;

function normalizeDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function includeVehiclePages(): boolean {
  const v = (process.env.NEXT_PUBLIC_SITEMAP_INCLUDE_VEHICLE_PAGES ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
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
  const baseUrl = getCanonicalSiteOrigin();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  function push(entry: MetadataRoute.Sitemap[number]) {
    if (!entry.url || seenUrls.has(entry.url)) return;
    seenUrls.add(entry.url);
    entries.push(entry);
  }

  /** Priority / changefreq per SEO sitemap export (2026-04-14). */
  const core: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${baseUrl}/lease-specials`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8
    },
    {
      url: `${baseUrl}/search?vehicle_type=used`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    { url: `${baseUrl}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/reviews`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${baseUrl}/most-reviewed-auto-broker-los-angeles`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.8 },
    { url: `${baseUrl}/contact-us`, lastModified: now, changeFrequency: "yearly", priority: 0.75 },
    { url: `${baseUrl}/why-us`, lastModified: now, changeFrequency: "yearly", priority: 0.75 },
    { url: `${baseUrl}/about-us`, lastModified: now, changeFrequency: "yearly", priority: 0.75 }
  ];
  for (const e of core) push(e);

  const apiArticles = await fetchPublicArticleSummaries();
  const articles = mergeArticleSummaries(getArticles(), apiArticles);
  const sortedArticles = [...articles].sort((a, b) => a.slug.localeCompare(b.slug));
  for (const article of sortedArticles) {
    push({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: normalizeDate(article.date),
      changeFrequency: "monthly",
      priority: 0.64
    });
  }

  push({
    url: `${baseUrl}/testimonials`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.64
  });

  if (includeVehiclePages()) {
    const vehicleEntries = await fetchInventoryVehicleEntries(baseUrl);
    for (const row of vehicleEntries) push(row);
  }

  return entries;
}
