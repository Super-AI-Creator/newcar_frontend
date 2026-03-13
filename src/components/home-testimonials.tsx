"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const PLACEHOLDER_TESTIMONIALS = [
  { id: "p1", quote: "Smooth process from start to delivery. No runaround.", author: "Maria L., Los Angeles", title: "First-time buyer" },
  { id: "p2", quote: "Got my car delivered with the red bow. Exactly as promised.", author: "James K., San Diego", title: "Lease special" },
  { id: "p3", quote: "Pre-approved in minutes and picked from statewide inventory.", author: "Sandra T., Bay Area", title: "No dealer visits" }
];

const MAX_VISIBLE = 4;

export default function HomeTestimonials() {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
    staleTime: 60_000
  });

  const items = testimonials.length > 0 ? testimonials.slice(0, MAX_VISIBLE) : PLACEHOLDER_TESTIMONIALS;
  const displayItems = items.slice(0, MAX_VISIBLE);

  return (
    <section className="border-b border-ink-200 bg-white py-8 sm:py-10">
      <div className="container-wide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">What drivers say</h2>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/reviews">All reviews</Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink-600">Real stories from California drivers.</p>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-ink-200 bg-ink-50 p-4">
                <div className="h-4 w-8 rounded bg-ink-200" />
                <div className="mt-3 h-3 w-24 rounded bg-ink-200" />
                <div className="mt-2 h-3 w-full rounded bg-ink-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayItems.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-ink-200 bg-[#f8fafc] p-4 text-left transition hover:border-brand-200 hover:shadow-sm"
              >
                <Quote className="h-5 w-5 text-brand-600/70" aria-hidden />
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-800">{t.quote}</p>
                <p className="mt-2 text-xs font-medium text-ink-600">{t.author}</p>
                {t.title && <p className="text-[11px] uppercase tracking-wide text-ink-500">{t.title}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
