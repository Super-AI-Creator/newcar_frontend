import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import TradeInPageClient from "./trade-in-client";

const origin = getCanonicalSiteOrigin();

/** Short shareable URL — in-site trade-in form only (`/trade-in-value` is instant appraisal). */
export const metadata: Metadata = {
  title: "Trade-in value | NewCarSuperstore",
  description:
    "Submit your trade-in details with New Car Superstore — California auto broker. Private, secure form; our team follows up with value guidance.",
  alternates: { canonical: `${origin}/trade-in` },
  openGraph: {
    url: `${origin}/trade-in`,
    title: "Trade-in value | NewCarSuperstore",
    description: "Complete our trade-in form — our team follows up with next steps.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function TradeInPage() {
  return <TradeInPageClient />;
}
