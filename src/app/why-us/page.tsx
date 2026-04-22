import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Car, Home, Shield, Sparkles, Users } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const origin = getCanonicalSiteOrigin();

export const metadata: Metadata = {
  title: "Why us | NewCarSuperstore",
  description:
    "Why choose NewCarSuperstore: licensed California auto broker, statewide inventory, transparent pricing, online process, and home delivery — without the traditional dealership hassle.",
  alternates: { canonical: `${origin}/why-us` },
  openGraph: {
    url: `${origin}/why-us`,
    title: "Why us | NewCarSuperstore",
    description: "Benefits of buying or leasing through a trusted California auto broker — online, clear, and delivery-focused.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

const benefits = [
  {
    icon: Shield,
    title: "Broker-backed, not dealer pressure",
    body: "We represent you — not a single franchise lot. That means help comparing real options across California inventory instead of being steered to what is on one showroom floor."
  },
  {
    icon: Car,
    title: "Statewide inventory, one workflow",
    body: "Shop new and used vehicles online, filter by what matters to you, and lean on our team to clarify payments, incentives, and availability before you commit."
  },
  {
    icon: Sparkles,
    title: "Transparent monthly numbers",
    body: "Lease specials and estimates are built to be readable. We want you to understand what drives the payment — so you can compare apples to apples with less noise."
  },
  {
    icon: Home,
    title: "Delivery to your door",
    body: "When you are ready, many clients complete the process remotely and take delivery at home — a smoother experience than bouncing between finance offices on a Saturday."
  },
  {
    icon: Users,
    title: "Humans who answer",
    body: "You can reach us by phone, email, or our contact form. Real people follow up — useful whether you are early in research or ready to structure a deal."
  },
  {
    icon: BadgeCheck,
    title: "Built for busy California drivers",
    body: "From Los Angeles and Orange County to Ventura and Santa Barbara, we routinely help shoppers who want efficiency, clarity, and a partner who stays with the process."
  }
] as const;

export default function WhyUsPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-ink-900">
      <SiteHeader />
      <main className="container-wide pb-16 pt-8 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <header className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-ink-900 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Trust &amp; experience</p>
            <h1 className="relative mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Why us</h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              NewCarSuperstore exists to make buying or leasing a new car in California simpler: less runaround, clearer numbers, and a
              team that stays with you from first question to delivery.
            </p>
          </header>

          <div className="mt-8 space-y-6 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:mt-10 sm:p-10">
            <ul className="grid gap-6 sm:gap-8">
              {benefits.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-5 sm:px-6">
              <p className="text-sm font-medium text-ink-800">
                Ready to talk?{" "}
                <Link href="/contact-us" className="text-brand-800 underline-offset-2 hover:underline">
                  Contact us
                </Link>{" "}
                or explore{" "}
                <Link href="/lease-specials" className="text-brand-800 underline-offset-2 hover:underline">
                  current lease specials
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
