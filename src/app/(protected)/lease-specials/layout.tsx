import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { leaseSpecialsFaqJsonLd } from "@/lib/json-ld/newcarsuperstore";
import { resolveSeoMetadata } from "@/lib/seo";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const LEASE_SEO_KEYWORDS = [
  "online lease specials California",
  "compare car lease offers California",
  "new car lease specials",
  "Mercedes lease specials",
  "Kia lease specials",
  "BMW lease specials",
  "car lease specials Los Angeles",
  "car lease specials California",
  "car leasing Santa Barbara",
  "auto lease Orange County California",
  "affordable car lease Los Angeles"
];

export async function generateMetadata(): Promise<Metadata> {
  const site = getCanonicalSiteOrigin();
  return resolveSeoMetadata("lease_specials", {
    title: "Find Online New Car Lease Specials in California | New Car Superstore",
    description:
      "Find online new car lease specials in California. Compare BMW, Mercedes & Kia lease offers in Los Angeles, Orange County & Santa Barbara. Best lease deals — apply now.",
    keywords: LEASE_SEO_KEYWORDS,
    alternates: { canonical: `${site}/lease-specials` },
    openGraph: {
      url: `${site}/lease-specials`,
      title: "Find Online New Car Lease Specials in California | New Car Superstore",
      description:
        "Find online new car lease specials in California. Compare BMW, Mercedes & Kia lease offers in Los Angeles, Orange County & Santa Barbara. Best lease deals — apply now."
    }
  });
}

export default function LeaseSpecialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={leaseSpecialsFaqJsonLd()} />
      {children}
    </>
  );
}
