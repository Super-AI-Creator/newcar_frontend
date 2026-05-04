import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import TradeInValuePageClient from "./trade-in-value-client";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  title: "Instant cash appraisal | NewCarSuperstore",
  description:
    "Get an instant cash appraisal from New Car Superstore — California auto broker. Start the secure online appraisal; our team follows up with value guidance.",
  alternates: { canonical: `${origin}/trade-in-value` },
  openGraph: {
    url: `${origin}/trade-in-value`,
    title: "Instant cash appraisal | NewCarSuperstore",
    description: "Secure online appraisal — start your instant cash appraisal in one place.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function TradeInValuePage() {
  return <TradeInValuePageClient />;
}
