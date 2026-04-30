import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { ArticleBody } from "@/components/article-body";
import { getArticleBySlug } from "@/lib/articles";
import { env } from "@/lib/env";

type Props = { params: Promise<{ slug: string }> };

type ArticleData = { title: string; description?: string; slug: string; date: string; content: string };

const API_FETCH_TIMEOUT_MS = 5000;

async function getArticleFromApi(slug: string): Promise<ArticleData | null> {
  const base = (env.apiBaseUrl || "").trim();
  if (!base) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/articles/by-slug/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleFromApi(slug) ?? getArticleBySlug(slug);
  if (!article) return { title: "Article | NewCarSuperstore" };
  return {
    title: `${article.title} | NewCarSuperstore`,
    description: article.description || undefined,
    openGraph: {
      title: article.title,
      description: article.description || undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = (await getArticleFromApi(slug)) ?? getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-white text-ink-900">
      <SiteHeader />
      <main className="container-wide py-10 sm:py-14">
        <Link href="/articles" className="text-sm font-medium text-brand-700 hover:underline">
          ← Articles
        </Link>
        <article className="mt-6 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">{article.title}</h1>
          <p className="mt-2 text-sm text-ink-500">{article.date}</p>
          <div className="mt-8">
            <ArticleBody content={article.content} />
          </div>
        </article>
      </main>
    </div>
  );
}
