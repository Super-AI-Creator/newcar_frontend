import type { Metadata } from "next";
import { Suspense } from "react";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import SearchPageClient from "./search-page-client";

/** Canonical must reflect `?vehicle_type=used` at request time (SEO sheet). */
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const origin = getCanonicalSiteOrigin();
  const raw = searchParams.vehicle_type;
  const vt = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const canonical = vt === "used" ? `${origin}/search?vehicle_type=used` : `${origin}/search`;
  return { alternates: { canonical } };
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  );
}
