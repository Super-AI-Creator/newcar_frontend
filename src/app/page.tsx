import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import LandingPageSections from "@/components/landing-page-sections";
import { JsonLd } from "@/components/json-ld";
import { homeFaqJsonLd } from "@/lib/json-ld/newcarsuperstore";
import { resolveSeoMetadata } from "@/lib/seo";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import { SiteFooter } from "@/components/site-footer";
import {
  fetchInitialFilters,
  fetchInitialHomepageSpecials,
  fetchInitialLandingPage,
  fetchInitialTestimonials,
} from "@/lib/server-public-data";

const HOME_SEO_KEYWORDS = [
  "new car deals Los Angeles",
  "auto broker Los Angeles California",
  "buy new car California",
  "online car buying Los Angeles",
  "new car broker in California",
  "car broker in California",
  "buy car without dealer California",
  "shop cars online California",
  "California car buying service",
  "trusted car broker Orange County",
  "Ventura County car deals",
  "Santa Barbara car purchase online",
  "Southern California new car offers",
  "stress free car buying California"
];

export async function generateMetadata(): Promise<Metadata> {
  const site = getCanonicalSiteOrigin();
  return resolveSeoMetadata("home", {
    title: "The New Way to Buy or Lease a Car — 100% Online + Home Delivery",
    description:
      "Buy or lease any new car in California without the dealership hassle. Shop statewide inventory, compare offers online, and get home delivery with a red bow.",
    keywords: HOME_SEO_KEYWORDS,
    alternates: { canonical: `${site}/` },
    openGraph: {
      url: `${site}/`,
      title: "The New Way to Buy or Lease a Car — 100% Online + Home Delivery",
      description:
        "Buy or lease any new car in California without the dealership hassle. Shop statewide inventory, compare offers online, and get home delivery with a red bow."
    }
  });
}

export const revalidate = 600;

export default async function HomePage() {
  const [initialLandingData, initialFilters, initialSpecials, initialTestimonials] = await Promise.all([
    fetchInitialLandingPage(),
    fetchInitialFilters("new"),
    fetchInitialHomepageSpecials(6),
    fetchInitialTestimonials(),
  ]);

  return (
    <div className="app-page min-h-screen text-ink-900">
      <JsonLd data={homeFaqJsonLd()} />
      <SiteHeader />

      <main>
        <LandingPageSections
          initialLandingData={initialLandingData}
          initialFilters={initialFilters}
          initialSpecials={initialSpecials}
          initialTestimonials={initialTestimonials}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
