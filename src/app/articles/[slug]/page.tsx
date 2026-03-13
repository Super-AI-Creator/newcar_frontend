import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { ArticleBody } from "@/components/article-body";
import { getArticleBySlug, getArticleSlugs } from "@/lib/articles";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
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
  const article = getArticleBySlug(slug);
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
