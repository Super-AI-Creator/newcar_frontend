"use client";

import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import TradeInValueDialog from "@/components/trade-in-value-dialog";
import DealSearchLoader from "@/components/deal-search-loader";
import { CASH_APPRAISAL_EMBED_URL } from "@/lib/cash-appraisal";

function TradeInValuePageBody() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6 py-6 sm:space-y-8 sm:py-8">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">New Car Superstore</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900 sm:text-3xl">Instant cash appraisal</h1>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">
            Complete the short appraisal flow below. Your information is handled on our secure appraisal experience.
          </p>
        </div>
        <TradeInValueDialog presentation="page" appraisalEmbedUrl={CASH_APPRAISAL_EMBED_URL} className="shadow-card" />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function TradeInValuePageClient() {
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
      <TradeInValuePageBody />
    </Suspense>
  );
}
