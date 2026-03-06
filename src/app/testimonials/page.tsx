"use client";

import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";

export default function TestimonialsPage() {
  const { data: testimonials, isLoading, error } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
  });

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Client Feedback</p>
          <h1 className="market-heading text-3xl sm:text-4xl">Testimonials</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Real experiences from customers who leased or purchased through New Car Superstore.
          </p>
        </section>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader label="Loading testimonials…" />
          </div>
        )}

        {error && (
          <Card className="border-ink-200 bg-white">
            <CardContent className="py-8 text-center text-sm text-ink-600">
              Unable to load testimonials. Please try again later.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (!testimonials || testimonials.length === 0) && (
          <Card className="border-ink-200 bg-white">
            <CardContent className="py-8 text-center text-sm text-ink-600">
              No testimonials yet. Check back soon.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && testimonials && testimonials.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.id} className="border-ink-200 bg-white shadow-sm">
                <CardContent className="flex flex-col gap-3 py-5">
                  {item.title && (
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">{item.title}</h3>
                  )}
                  <p className="flex-1 text-sm leading-relaxed text-ink-700">&ldquo;{item.quote}&rdquo;</p>
                  <p className="text-sm font-semibold text-ink-900">— {item.author}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
