import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { getArticles } from "@/lib/articles";
export const metadata: Metadata = {
  title: "Articles | NewCarSuperstore",
  description: "Guides and articles about leasing and buying new cars in California — without the dealership runaround.",
};

export default async function ArticlesIndexPage() {
  const articles = getArticles();

  return (
    <div className="min-h-screen bg-white text-ink-900">
      <SiteHeader />
      <main className="container-wide py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">Articles</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Guides and tips for leasing and buying a new car in California — shop from home, get pre-approved, and have your car delivered.
        </p>
        <ul className="mt-8 space-y-4">
          {articles.length === 0 ? (
            <li className="text-sm text-ink-500">No articles yet. Add markdown files in <code className="rounded bg-ink-100 px-1">content/articles/</code>.</li>
          ) : (
            articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/articles/${a.slug}`}
                  className="block rounded-xl border border-ink-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
                >
                  <h2 className="font-display text-lg font-semibold text-ink-900">{a.title}</h2>
                  {a.description && <p className="mt-1 text-sm text-ink-600">{a.description}</p>}
                  <p className="mt-2 text-xs text-ink-500">{a.date}</p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </main>
    </div>
  );
}
