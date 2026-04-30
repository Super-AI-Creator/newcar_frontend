import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  alternates: { canonical: `${origin}/reviews` }
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
