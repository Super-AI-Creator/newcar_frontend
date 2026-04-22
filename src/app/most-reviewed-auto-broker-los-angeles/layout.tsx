import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  alternates: { canonical: `${origin}/most-reviewed-auto-broker-los-angeles` }
};

export default function MostReviewedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
