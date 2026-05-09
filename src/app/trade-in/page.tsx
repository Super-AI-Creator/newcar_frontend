import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import TradeInValuePageClient from "../trade-in-value/trade-in-value-client";

const origin = getCanonicalSiteOrigin();

/** Short shareable URL (same flow as `/trade-in-value`), parallel to `/credit-application`. */
export const metadata: Metadata = {
  title: "Instant cash appraisal | NewCarSuperstore",
  description:
    "Get an instant cash appraisal from New Car Superstore — California auto broker. Start the secure online appraisal; our team follows up with value guidance.",
  alternates: { canonical: `${origin}/trade-in` },
  openGraph: {
    url: `${origin}/trade-in`,
    title: "Instant cash appraisal | NewCarSuperstore",
    description: "Secure online appraisal — start your instant cash appraisal in one place.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function TradeInPage() {
  return <TradeInValuePageClient />;
}
