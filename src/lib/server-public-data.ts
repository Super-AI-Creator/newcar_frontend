import { env } from "@/lib/env";
import type { LandingPageContentRecord, Vehicle } from "@/lib/api";

type FiltersPayload = {
  makes?: string[];
  models?: string[];
  trims?: string[];
  models_by_make?: Record<string, string[]>;
  trims_by_make_model?: Record<string, string[]>;
};

type SearchPayload = { results: Vehicle[]; total: number };

const DEFAULT_REVALIDATE_SECONDS = 600;
const DEFAULT_TIMEOUT_MS = 1800;

async function fetchPublicJson(path: string): Promise<unknown | null> {
  const apiBase = (env.apiBaseUrl || "").trim().replace(/\/$/, "");
  if (!apiBase) return null;
  const url = `${apiBase}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeSearchPayload(raw: unknown): SearchPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { items?: unknown[]; results?: unknown[]; total?: unknown };
  const results = Array.isArray(obj.results) ? obj.results : Array.isArray(obj.items) ? obj.items : [];
  return {
    results: results as Vehicle[],
    total: typeof obj.total === "number" ? obj.total : results.length,
  };
}

export async function fetchInitialLandingPage(): Promise<LandingPageContentRecord | undefined> {
  const raw = await fetchPublicJson("/landing-page");
  if (!raw || typeof raw !== "object") return undefined;
  return raw as LandingPageContentRecord;
}

export async function fetchInitialFilters(vehicleType: "new" | "used" | "all", offersOnly = false): Promise<FiltersPayload | undefined> {
  const qs = new URLSearchParams();
  qs.set("vehicle_type", vehicleType);
  if (offersOnly) qs.set("offers_only", "true");
  const raw = await fetchPublicJson(`/inventory/filters?${qs.toString()}`);
  if (!raw || typeof raw !== "object") return undefined;
  return raw as FiltersPayload;
}

export async function fetchInitialHomepageSpecials(limit = 6): Promise<SearchPayload | undefined> {
  const raw = await fetchPublicJson(`/inventory/homepage-specials?limit=${encodeURIComponent(String(limit))}`);
  return normalizeSearchPayload(raw);
}

type Testimonial = {
  id: string;
  quote: string;
  author: string;
  title?: string | null;
  image_url?: string | null;
};

export async function fetchInitialTestimonials(): Promise<Testimonial[] | undefined> {
  const raw = await fetchPublicJson("/testimonials");
  return Array.isArray(raw) ? (raw as Testimonial[]) : undefined;
}
