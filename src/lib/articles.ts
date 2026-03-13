import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

export type ArticleMeta = {
  title: string;
  description: string;
  slug: string;
  date: string;
};

export type Article = ArticleMeta & {
  content: string;
};

function parseMeta(data: Record<string, unknown>): ArticleMeta {
  const title = (data.title as string)?.trim() || "Untitled";
  const description = (data.description as string)?.trim() || "";
  const slug = (data.slug as string)?.trim() || title.toLowerCase().replace(/\s+/g, "-");
  const date = (data.date as string)?.trim() || new Date().toISOString().slice(0, 10);
  return { title, description, slug, date };
}

/** File basenames (without .md) for internal use. */
function getArticleFilenames(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR);
  return files
    .filter((f) => f.endsWith(".md") && !f.toLowerCase().startsWith("readme"))
    .map((f) => path.basename(f, ".md"));
}

/** Public URL slugs (from frontmatter or derived from filename). */
export function getArticleSlugs(): string[] {
  return getArticles().map((a) => a.slug);
}

export function getArticles(): ArticleMeta[] {
  const filenames = getArticleFilenames();
  const articles: ArticleMeta[] = [];
  for (const filename of filenames) {
    const fullPath = path.join(ARTICLES_DIR, `${filename}.md`);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data } = matter(raw);
      const meta = parseMeta(data as Record<string, unknown>);
      articles.push({ ...meta, slug: meta.slug });
    } catch {
      // skip invalid files
    }
  }
  articles.sort((a, b) => (b.date > a.date ? 1 : -1));
  return articles;
}

export function getArticleBySlug(slug: string): Article | null {
  const filenames = getArticleFilenames();
  for (const filename of filenames) {
    const fullPath = path.join(ARTICLES_DIR, `${filename}.md`);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data, content } = matter(raw);
      const meta = parseMeta(data as Record<string, unknown>);
      if (meta.slug === slug) return { ...meta, slug, content: content.trim() };
    } catch {
      // continue
    }
  }
  return null;
}

export function getAllArticleSlugsForSitemap(): string[] {
  return getArticleSlugs();
}
