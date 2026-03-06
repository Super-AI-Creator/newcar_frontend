"use client";

import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export default function MostReviewedPage() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Reputation</p>
          <h1 className="market-heading text-3xl sm:text-4xl">Most Reviewed Auto Broker in Los Angeles</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            See what our clients say on Yelp and Google. We focus on transparency and hassle-free car buying.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Yelp Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-600">
                Read our Yelp reviews from verified customers. New Car Superstore is one of the most reviewed auto brokers in the Los Angeles area.
              </p>
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
              <p className="text-sm text-ink-600">
                Check our Google Maps reviews. Our team is rated by real clients for service, communication, and fair pricing.
              </p>
              <Button asChild variant="outline">
                <a href={env.googleMapsUrl} target="_blank" rel="noreferrer noopener">
                  View on Google Maps
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-ink-200 bg-white">
          <CardContent className="py-6">
            <p className="text-sm text-ink-600">
              For curated highlights and detailed testimonials from our clients, visit our{" "}
              <Link href="/testimonials" className="font-medium text-brand-700 hover:text-brand-800 underline">
                testimonials page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
