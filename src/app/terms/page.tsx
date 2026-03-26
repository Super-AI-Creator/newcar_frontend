import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms | NewCarSuperstore",
  description: "Terms of use for the NewCarSuperstore website and marketplace.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <SiteHeader />
      <main className="container-wide max-w-3xl py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">Terms of use</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">
          By using this site you agree to use it lawfully and to provide accurate information on forms and applications. Inventory,
          pricing, and payment estimates are subject to change and to confirmation with dealers and lenders. Nothing on this site is a
          binding offer until you and the relevant seller or lender complete their own agreements.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">
          We may change site features or these terms over time. Continued use after changes means you accept the updated terms. If you do
          not agree, please stop using the site.
        </p>
        <p className="mt-6 text-xs text-ink-500">
          This is a short placeholder for customers. Have your attorney review and replace with full terms, disclosures, and state-specific
          language as required for your business.
        </p>
      </main>
    </div>
  );
}
