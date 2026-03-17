"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = { params: { slug: string } };

export default function WhiteLabelCreditUnionPage({ params }: Props) {
  const slugValue = params.slug ?? "";

  const cuQuery = useQuery({
    queryKey: ["credit-union", slugValue],
    queryFn: () => api.getCreditUnionBySlug(slugValue),
    enabled: !!slugValue,
  });

  const cu = cuQuery.data;
  const isLoading = cuQuery.isLoading;
  const notFound = !isLoading && !cu;

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md border-ink-200 bg-white">
          <CardContent className="py-10 text-center text-ink-600">
            <p>This page is not available.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/">Go back</Link>
            </Button>
          </CardContent>
        </Card>
        <footer className="mt-8 text-center text-xs text-ink-400">
          Powered by New Car Superstore
        </footer>
      </div>
    );
  }

  const siteName = cu?.name ?? "";
  const heroTitle = (cu?.hero_title ?? "").trim() || siteName;
  const heroSubtitle = (cu?.hero_subtitle ?? "").trim() || "Vehicle shopping with your credit union's financing.";

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink-900">
      {/* Header: logo only, no NCS branding */}
      <header className="border-b border-ink-200 bg-white py-4 shrink-0">
        <div className="container-wide flex items-center justify-between">
          {cu?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cu.logo_url}
              alt={siteName}
              className="h-11 w-auto max-w-[200px] object-contain object-left"
            />
          ) : (
            <span className="font-display text-xl font-semibold text-ink-900">{siteName || "…"}</span>
          )}
        </div>
      </header>

      {/* Banner: editable image or generic bar */}
      {cu?.banner_url ? (
        <div className="w-full shrink-0 overflow-hidden bg-ink-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cu.banner_url}
            alt=""
            className="h-32 w-full object-cover object-center sm:h-40 md:h-48"
          />
        </div>
      ) : (
        <div
          className="h-24 w-full shrink-0 bg-gradient-to-r from-ink-700 to-ink-800 sm:h-28 md:h-32"
          aria-hidden
        />
      )}

      <main className="container-wide flex-1 py-10">
        {isLoading && (
          <div className="py-20 text-center text-ink-500">Loading…</div>
        )}
        {cu && !isLoading && (
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Editable hero text */}
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                {heroTitle}
              </h1>
              <p className="mt-3 text-ink-600">{heroSubtitle}</p>
            </div>

            <Card className="border-ink-200 bg-ink-50/50">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-ink-700">
                  Search inventory and use our finance calculator with rates from your credit union.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/search?vehicle_type=new&mode=price&cu=${encodeURIComponent(cu.slug)}`}>
                      Search new cars
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/search?vehicle_type=used&mode=price&cu=${encodeURIComponent(cu.slug)}`}>
                      Search used cars
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {cu.loan_programs && cu.loan_programs.length > 0 && (
              <div className="rounded-xl border border-ink-200 bg-white p-4">
                <h2 className="font-display text-lg font-semibold text-ink-900">Your rates</h2>
                <ul className="mt-2 space-y-1 text-sm text-ink-700">
                  {cu.loan_programs.map((p, i) => (
                    <li key={i}>
                      {p.interest_rate}% APR, up to {p.max_term_months} months · {p.vehicle_type === "used" ? "Used" : "New"} vehicles
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer: only NCS reference */}
      <footer className="mt-auto border-t border-ink-200 bg-ink-50 py-4 shrink-0">
        <div className="container-wide text-center text-xs text-ink-500">
          Powered by New Car Superstore
        </div>
      </footer>
    </div>
  );
}
