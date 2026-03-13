import type { Metadata } from "next";
import { env } from "@/lib/env";

type SeoPayload = {
  page_key: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  robots?: string | null;
  json_ld?: unknown;
};

function parseKeywords(raw?: string | null): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseRobots(raw?: string | null): Metadata["robots"] | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  return {
    index: !lower.includes("noindex"),
    follow: !lower.includes("nofollow")
  };
}

async function fetchSeoPayload(pageKey: string): Promise<SeoPayload | null> {
  const base = (env.apiBaseUrl || "").trim();
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/seo/pages/${encodeURIComponent(pageKey)}`;
  try {
    const response = await fetch(url, {
      // Keep SEO edits reasonably fresh without forcing a no-store penalty on every request.
      next: { revalidate: 180 }
    });
    if (!response.ok) return null;
    return (await response.json()) as SeoPayload;
  } catch {
    return null;
  }
}

export async function resolveSeoMetadata(pageKey: string, fallback: Metadata): Promise<Metadata> {
  const primary = await fetchSeoPayload(pageKey);
  const fallbackSite = pageKey !== "site_default" ? await fetchSeoPayload("site_default") : null;
  const seo = primary ?? fallbackSite;
  if (!seo) return fallback;

  const title = seo.title?.trim() || undefined;
  const description = seo.description?.trim() || undefined;
  const ogTitle = seo.og_title?.trim() || title;
  const ogDescription = seo.og_description?.trim() || description;
  const ogImage = seo.og_image_url?.trim() || undefined;
  const canonical = seo.canonical_url?.trim() || undefined;

  const merged: Metadata = {
    ...fallback,
    title: title ?? fallback.title,
    description: description ?? fallback.description,
    keywords: parseKeywords(seo.keywords) ?? fallback.keywords,
    robots: parseRobots(seo.robots) ?? fallback.robots,
  };

  if (canonical) {
    merged.alternates = {
      ...(fallback.alternates ?? {}),
      canonical
    };
  }

  merged.openGraph = {
    ...(fallback.openGraph ?? {}),
    title: ogTitle ?? (fallback.openGraph && "title" in fallback.openGraph ? fallback.openGraph.title : undefined),
    description:
      ogDescription ??
      (fallback.openGraph && "description" in fallback.openGraph ? fallback.openGraph.description : undefined),
    images: ogImage
      ? [{ url: ogImage }]
      : fallback.openGraph && "images" in fallback.openGraph
        ? fallback.openGraph.images
        : undefined
  };

  return merged;
}
