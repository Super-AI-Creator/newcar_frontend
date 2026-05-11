"use client";

import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import TradeInValueDialog from "@/components/trade-in-value-dialog";
import DealSearchLoader from "@/components/deal-search-loader";

/** `/trade-in` only — in-site trade-in wizard (no instant appraisal iframe). */
function TradeInPageBody() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6 py-6 sm:space-y-8 sm:py-8">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">New Car Superstore</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900 sm:text-3xl">Trade-in value</h1>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">
            Complete the trade-in form below. Your details stay private — our team follows up with next steps.
          </p>
        </div>
        <TradeInValueDialog presentation="page" className="shadow-card" />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function TradeInPageClient() {
  return (
    <Suspense
      fallback={
        <div className="app-page min-h-screen">
          <SiteHeader />
          <main className="app-main py-10">
            <DealSearchLoader />
          </main>
        </div>
      }
    >
      <TradeInPageBody />
    </Suspense>
  );
}
