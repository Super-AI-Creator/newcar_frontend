"use client";

import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { api } from "@/lib/api";
import { env } from "@/lib/env";

export default function ReviewsPage() {
  const { data: testimonials, isLoading, error } = useQuery({
    queryKey: ["reviews-testimonials"],
    queryFn: () => api.getTestimonials()
  });

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Reputation</p>
          <h1 className="market-heading text-3xl sm:text-4xl">Reviews</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Public review profiles and curated customer testimonials in one place.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Yelp Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-600">Read our Yelp reviews from verified customers.</p>
              <Button asChild>
                <a href={env.yelpUrl} target="_blank" rel="noreferrer noopener">
                  View on Yelp
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Google Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-600">Check our Google Maps review profile and ratings.</p>
              <Button asChild variant="outline">
                <a href={env.googleMapsUrl} target="_blank" rel="noreferrer noopener">
                  View on Google Maps
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Client Testimonials</h2>
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader label="Loading testimonials..." />
            </div>
          )}
          {error && (
            <Card className="border-ink-200 bg-white">
              <CardContent className="py-8 text-center text-sm text-ink-600">
                Unable to load testimonials right now.
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((item) => (
                <Card key={item.id} className="border-ink-200 bg-white shadow-sm">
                  <CardContent className="flex flex-col gap-3 py-5">
                    {item.title && <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">{item.title}</h3>}
                    <p className="flex-1 text-sm leading-relaxed text-ink-700">&ldquo;{item.quote}&rdquo;</p>
                    <p className="text-sm font-semibold text-ink-900">- {item.author}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

