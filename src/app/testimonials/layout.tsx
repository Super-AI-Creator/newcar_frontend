import type { Metadata } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  alternates: { canonical: `${origin}/testimonials` }
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
