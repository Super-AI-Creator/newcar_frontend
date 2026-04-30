import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";

const SOURCE_POLICY_URL = "https://www.newcarsuperstore.com/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy & terms of use | NewCarSuperstore",
  description:
    "Single page: privacy policy and terms of use for New Car Superstore — auto brokerage in Oxnard, California.",
};

/** One document: privacy first, then terms — all on /privacy */
const toc = [
  { id: "privacy-policy", label: "Privacy policy" },
  { id: "terms-of-use", label: "Terms of use" },
  { id: "broker-fee-refund", label: "Broker fee refund" },
  { id: "general-disclosure", label: "General disclosure" },
  { id: "copyright", label: "Copyright" }
] as const;

export default function PrivacyAndTermsPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-ink-900">
      <SiteHeader />
      <main className="container-wide pb-20 pt-6 sm:pb-24 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <header className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-ink-900 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
            <div
              className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Legal — one page</p>
            <h1 className="relative mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy policy &amp; terms of use
            </h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              Everything below is on this single page: how we handle personal information, plus broker fees, disclosures, and copyright. The
              same notices appear at{" "}
              <a
                href={SOURCE_POLICY_URL}
                className="font-medium text-white underline decoration-white/40 underline-offset-2 transition-colors hover:decoration-white"
                target="_blank"
                rel="noreferrer noopener"
              >
                newcarsuperstore.com/privacy-policy
              </a>
              .
            </p>
          </header>

          <div className="mt-6 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-md sm:mt-8 sm:p-8">
            <nav
              aria-label="On this page"
              className="mb-8 rounded-xl border border-ink-100 bg-ink-50/80 px-4 py-4 sm:px-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">On this page</p>
              <ol className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {toc.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      href={`#${item.id}`}
                      className="text-brand-800 underline decoration-brand-800/25 underline-offset-2 transition-colors hover:text-brand-900 hover:decoration-brand-900"
                    >
                      <span className="text-ink-400">{i + 1}.</span> {item.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="space-y-12 text-[15px] leading-[1.8] text-ink-700 sm:text-base sm:leading-relaxed">
              <section id="privacy-policy" className="scroll-mt-24">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Privacy policy</h2>
                <div className="mt-6 border-l-[3px] border-brand-600 pl-5 sm:pl-6">
                  <h3 className="text-lg font-semibold text-ink-900">Disclaimer</h3>
                  <div className="mt-4 space-y-4">
                    <p>New Car Superstore is an auto brokerage company based in Oxnard, California. We broker new and used vehicles.</p>
                    <p>
                      We are licensed by the California Department of Motor Vehicles. We take seriously our responsibility to respect the
                      confidentiality and security of Personal Financial Information provided by business principals (called &quot;Personal
                      Financial Information&quot; in this notice).
                    </p>
                    <p>
                      Our policy calls for safeguards to protect such Personal Financial Information from unauthorized access, alteration,
                      and destruction.
                    </p>
                    <p>
                      For example, our policies authorize access to Personal Financial Information only by those who need access to do their
                      work. The same holds true for our affiliated companies which are companies that, now or in the future, we own (or
                      control) or own (or control) by, or under are common ownership (or control) with. We also maintain physical,
                      electronic, and procedural safeguards to guard Personal Financial Information. For more information regarding pricing
                      or payments posted on this website please call us at{" "}
                      <a
                        href="tel:+18187059200"
                        className="font-semibold text-brand-800 underline decoration-brand-800/30 underline-offset-2 hover:text-brand-900"
                      >
                        818.705.9200
                      </a>
                      . Special lease rates and pricing may not be reflected throughout this website. All figures presented are estimates
                      only.
                    </p>
                    <p>
                      The actual selling price may vary based on market conditions and are subject to change at any time, without any
                      notice. Also, the monthly payments posted are based on approval from a financial institution and a price approval
                      from the dealer partner, not everyone will qualify. Please call us or visit your local leasing office for more
                      details. As California&apos;s sales and use tax (which applies to vehicle leases) vary by jurisdiction, our advertised
                      pricing does not include taxes, which are added to the monthly payment listed.
                    </p>
                    <p>
                      When contacting our office, please be certain to identify your local jurisdiction so the proper tax may be
                      determined.
                    </p>
                  </div>
                </div>
              </section>

              <section id="terms-of-use" className="scroll-mt-24 border-t border-ink-100 pt-12">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Terms of use</h2>
                <p className="mt-2 text-sm text-ink-500 sm:text-[15px]">
                  The following sections are part of the same agreement as the privacy policy above — not a separate page.
                </p>

                <div id="broker-fee-refund" className="scroll-mt-24 mt-8 border-l-[3px] border-brand-600 pl-5 sm:pl-6">
                  <h3 className="text-lg font-semibold text-ink-900">Broker fee refund policy</h3>
                  <p className="mt-4">
                    The Auto Broker fee is payable at the time of delivery of your new vehicle. Your sales agent will provide you with a
                    detailed statement for the broker fee as well as any other fees, like delivery fees, shipping, etc. As this is a new car
                    transaction and in the state of California, there is no cooling-off period on new cars, therefore are no refunds for the
                    broker fee. You cannot simply return the car later for any reason, therefore we do not offer refunds for our service.
                    There are multi-car discounts on the service as well as repeat client special discounts. Please ask your sales agent or
                    call for details.
                  </p>
                </div>

                <div id="general-disclosure" className="scroll-mt-24 mt-10 border-l-[3px] border-brand-600 pl-5 sm:pl-6">
                  <h3 className="text-lg font-semibold text-ink-900">General disclosure</h3>
                  <div className="mt-4 space-y-4">
                    <p>
                      Pictures are only for demonstration purposes. Negotiated price is subject to change at any time and availability.
                      O.A.C: On Approved TR1+ Credit From Primary Lender Down Payment: in term of leasing a car, down payment is also knows
                      as Capital (Cap) Cost Reduction and does not include what is referred to as the &quot;drive-off&quot; (First-month
                      payment, DMV registration fees, and taxes) D.A.S: Due At Signing; first-month payment, registration, bank fee, and
                      taxes.
                    </p>
                    <p>
                      All payments exclude tax. We strive for accuracy, but this pricing information may be different in your State. We are
                      not responsible for typographical errors.
                    </p>
                  </div>
                </div>

                <div
                  id="copyright"
                  className="scroll-mt-24 mt-10 rounded-xl border border-ink-200 bg-gradient-to-br from-ink-50 to-white px-5 py-6 sm:px-6"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Copyright</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-ink-800 sm:text-[15px]">
                    Copyright © New Car Superstore&nbsp;&nbsp;All rights reserved. Unless otherwise noted, all content, including images,
                    text, graphics, video, and audio, is the property of the New Car Superstore redistribution or commercial use without the
                    expressed, written permission of New Car Superstore is prohibited.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
