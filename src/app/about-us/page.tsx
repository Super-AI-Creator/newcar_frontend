import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  title: "About us | NewCarSuperstore",
  description:
    "About NewCarSuperstore — California auto brokerage based in Oxnard. Our mission: help you buy or lease a new car online with clear information, broker support, and home delivery.",
  alternates: { canonical: `${origin}/about-us` },
  openGraph: {
    url: `${origin}/about-us`,
    title: "About us | NewCarSuperstore",
    description: "Company background, mission, and values for NewCarSuperstore — your California new car broker.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-ink-900">
      <SiteHeader />
      <main className="container-wide pb-16 pt-8 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <header className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-ink-900 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" aria-hidden />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Our company</p>
            <h1 className="relative mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">About us</h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              NewCarSuperstore is a California-focused auto brokerage helping drivers shop, compare, and complete new car purchases and
              leases — with less dealership stress and more clarity.
            </p>
          </header>

          <div className="mt-8 space-y-10 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:mt-10 sm:p-10">
            <section className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold text-ink-900">Background</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700 sm:text-base">
                The traditional car-buying experience can mean long showroom visits, confusing payment quotes, and pressure before you are
                ready. We built NewCarSuperstore around a different idea: combine real broker expertise with a modern online workflow so
                you can research inventory, understand numbers, and move forward on your timeline — whether you are in Los Angeles, Orange
                County, Ventura County, Santa Barbara, or elsewhere in California.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900">Mission</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700 sm:text-base">
                Our mission is to make it easier to buy or lease the right new car: honest communication, competitive structuring, and
                support through delivery — so you spend less time negotiating in circles and more time enjoying your vehicle.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900">Values</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-ink-700 sm:text-base">
                <li>
                  <span className="font-semibold text-ink-900">Clarity first</span> — we work to explain payments, trade-ins, and next
                  steps in plain language.
                </li>
                <li>
                  <span className="font-semibold text-ink-900">Respect for your time</span> — online tools and responsive follow-up so
                  you are not stuck waiting on a lot.
                </li>
                <li>
                  <span className="font-semibold text-ink-900">Privacy</span> — your contact details are handled carefully; see our{" "}
                  <Link href="/privacy" className="font-medium text-brand-800 underline-offset-2 hover:underline">
                    privacy policy
                  </Link>{" "}
                  for details.
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-ink-100 bg-ink-50/80 px-4 py-5 sm:px-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Talk with our team</h2>
              <p className="mt-2 text-sm text-ink-700">
                Have a question about how we work? Visit{" "}
                <Link href="/why-us" className="font-medium text-brand-800 underline-offset-2 hover:underline">
                  Why us
                </Link>{" "}
                or{" "}
                <Link href="/contact-us" className="font-medium text-brand-800 underline-offset-2 hover:underline">
                  Contact us
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
