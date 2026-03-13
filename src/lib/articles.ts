import fs from "fs";
import path from "path";

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

/** Minimal YAML frontmatter parse: supports "key: value" lines (value can be in quotes). */
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const data: Record<string, string> = {};
  let content = raw;
  if (match) {
    const fm = match[1];
    content = match[2].trim();
    for (const line of fm.split(/\r?\n/)) {
      const m = line.match(/^([a-z_]+):\s*(?:["']([^"']*)["']|(.+?))\s*$/);
      if (m) data[m[1]] = (m[2] ?? m[3] ?? "").trim();
    }
  }
  return { data, content };
}

function parseMeta(data: Record<string, string>): ArticleMeta {
  const title = (data.title ?? "").trim() || "Untitled";
  const description = (data.description ?? "").trim();
  const slug = (data.slug ?? "").trim() || title.toLowerCase().replace(/\s+/g, "-");
  const date = (data.date ?? "").trim() || new Date().toISOString().slice(0, 10);
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
      const { data, content: _ } = parseFrontmatter(raw);
      const meta = parseMeta(data);
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
      const { data, content } = parseFrontmatter(raw);
      const meta = parseMeta(data);
      if (meta.slug === slug) return { ...meta, slug, content };
    } catch {
      // continue
    }
  }
  return null;
}

export function getAllArticleSlugsForSitemap(): string[] {
  return getArticleSlugs();
}
