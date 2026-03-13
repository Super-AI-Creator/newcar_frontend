import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SiteHeader from "@/components/site-header";
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
          <div className="article-body mt-8 space-y-4 text-ink-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} className="font-medium text-brand-700 underline hover:no-underline">
                    {children}
                  </a>
                ),
                strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
                h2: ({ children }) => <h2 className="mt-6 font-display text-xl font-semibold text-ink-900">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{children}</h3>,
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
}
