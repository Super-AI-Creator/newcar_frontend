"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const PLACEHOLDER_TESTIMONIALS = [
  { id: "p1", quote: "Smooth process from start to delivery. No runaround.", author: "Maria L., Los Angeles", title: "First-time buyer" },
  { id: "p2", quote: "Got my car delivered with the red bow. Exactly as promised.", author: "James K., San Diego", title: "Lease special" },
  { id: "p3", quote: "Pre-approved in minutes and picked from statewide inventory.", author: "Sandra T., Bay Area", title: "No dealer visits" }
];

type Testimonial = {
  id: string;
  quote: string;
  author: string;
  title?: string | null;
  image_url?: string | null;
};

const AUTOPLAY_INTERVAL_MS = 7000;

export default function HomeTestimonials() {
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
    staleTime: 60_000
  });

  const items: Testimonial[] = useMemo(
    () => (testimonials.length > 0 ? testimonials : PLACEHOLDER_TESTIMONIALS),
    [testimonials]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const goTo = (index: number) => {
    if (items.length === 0) return;
    const next = ((index % items.length) + items.length) % items.length;
    setActiveIndex(next);
  };

  return (
    <section className="border-b border-ink-200 bg-white py-8 sm:py-10">
      <div className="container-wide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">
            We have hundreds of good reviews
          </h2>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/reviews">All reviews</Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Real testimonials from California auto broker clients who bought and leased through us.
        </p>

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
        ) : items.length === 0 ? null : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-[#f8fafc] px-4 py-6 sm:px-8">
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {items.map((_, pageIndex) => (
                <div key={`page-${pageIndex}`} className="w-full flex-shrink-0">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((offset) => {
                      const index = (pageIndex + offset) % items.length;
                      const t = items[index];
                      const initials = t.author
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("");
                      return (
                        <div
                          key={`${t.id}-${pageIndex}-${offset}`}
                          className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white/85 p-4 text-left shadow-sm transition hover:shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-ink-200 bg-ink-900 text-white shadow">
                              {t.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={t.image_url} alt={t.author} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                                  {initials || <Quote className="h-4 w-4" aria-hidden />}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-ink-800">{t.author}</p>
                              {t.title && (
                                <p className="text-[11px] uppercase tracking-wide text-ink-500 line-clamp-1">{t.title}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-ink-900 sm:text-[15px]">“{t.quote}”</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`h-2 w-2 rounded-full transition ${
                    index === activeIndex ? "bg-brand-600" : "bg-ink-300 hover:bg-ink-400"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
