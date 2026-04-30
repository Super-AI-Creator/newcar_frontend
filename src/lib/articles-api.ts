import type { ArticleMeta } from "@/lib/articles";
import { env } from "@/lib/env";

const API_FETCH_TIMEOUT_MS = 6000;

type ApiArticleRow = {
  title?: string;
  description?: string;
  slug?: string;
  date?: string;
};

function normalizeApiArticle(row: ApiArticleRow): ArticleMeta | null {
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!slug || !title) return null;
  const description = typeof row.description === "string" ? row.description.trim() : "";
  const date =
    typeof row.date === "string" && row.date.trim()
      ? row.date.trim()
      : new Date().toISOString().slice(0, 10);
  return { title, description, slug, date };
}

/** Public GET /articles (CMS). */
export async function fetchPublicArticleSummaries(): Promise<ArticleMeta[]> {
  const base = (env.apiBaseUrl || "").trim();
  if (!base) return [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/articles`, {
      signal: controller.signal,
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown[] };
    const items = Array.isArray(data?.items) ? data.items : [];
    const out: ArticleMeta[] = [];
    for (const raw of items) {
      const row = raw as ApiArticleRow;
      const meta = normalizeApiArticle(row);
      if (meta) out.push(meta);
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Merge markdown articles with CMS list; CMS wins on duplicate slug. */
export function mergeArticleSummaries(fileArticles: ArticleMeta[], apiArticles: ArticleMeta[]): ArticleMeta[] {
  const bySlug = new Map<string, ArticleMeta>();
  for (const a of fileArticles) {
    if (a.slug) bySlug.set(a.slug, a);
  }
  for (const a of apiArticles) {
    if (a.slug) bySlug.set(a.slug, a);
  }
  return Array.from(bySlug.values()).sort((a, b) => {
    if (b.date !== a.date) return b.date > a.date ? 1 : -1;
    return a.slug.localeCompare(b.slug);
  });
}
