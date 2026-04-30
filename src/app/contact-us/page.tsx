import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import ContactUsForm from "@/components/contact-us-form";
import { getCanonicalSiteOrigin } from "@/lib/site-url";
import {
  getMarketingContactEmail,
  MARKETING_ADDRESS_LINE,
  MARKETING_PHONE_DISPLAY,
  MARKETING_PHONE_TEL
} from "@/lib/marketing-contact";

const origin = getCanonicalSiteOrigin();
const contactEmail = getMarketingContactEmail();

export const metadata: Metadata = {
  title: "Contact us | NewCarSuperstore",
  description:
    "Contact NewCarSuperstore — California auto broker. Call, email, or send a message. Oxnard office; statewide inventory, online quotes, and home delivery.",
  alternates: { canonical: `${origin}/contact-us` },
  openGraph: {
    url: `${origin}/contact-us`,
    title: "Contact us | NewCarSuperstore",
    description: "Reach our team by phone, email, or the secure contact form.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-ink-900">
      <SiteHeader />
      <main className="container-wide pb-16 pt-8 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <header className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-ink-900 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" aria-hidden />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Get in touch</p>
            <h1 className="relative mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Contact us</h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              Questions about a vehicle, lease payment, trade-in, or delivery? Call or email us, or use the form — a broker will get
              back to you.
            </p>
          </header>

          <div className="mt-8 grid gap-6 sm:mt-10">
            <div className="grid gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6">
              <a
                href={`tel:${MARKETING_PHONE_TEL}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-4 text-center transition hover:border-brand-200 hover:bg-white sm:items-start sm:text-left"
              >
                <Phone className="h-5 w-5 text-brand-600" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Phone</span>
                <span className="text-sm font-semibold text-ink-900">{MARKETING_PHONE_DISPLAY}</span>
              </a>
              <a
                href={`mailto:${encodeURIComponent(contactEmail)}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-4 text-center transition hover:border-brand-200 hover:bg-white sm:items-start sm:text-left"
              >
                <Mail className="h-5 w-5 text-brand-600" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Email</span>
                <span className="break-all text-sm font-semibold text-brand-800">{contactEmail}</span>
              </a>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-4 text-center sm:items-start sm:text-left">
                <MapPin className="h-5 w-5 text-brand-600" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Office</span>
                <span className="text-sm font-medium leading-snug text-ink-800">{MARKETING_ADDRESS_LINE}</span>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Send a message</h2>
              <p className="mt-1 text-sm text-ink-600">
                Prefer typing it out? Use the form below. For the fastest help on an active deal, mention your phone number and the
                vehicle you are considering. You can also browse{" "}
                <Link href="/lease-specials" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                  lease specials
                </Link>{" "}
                or{" "}
                <Link href="/search?vehicle_type=new" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                  new inventory
                </Link>
                .
              </p>
              <div className="mt-5">
                <ContactUsForm />
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
