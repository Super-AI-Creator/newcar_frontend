import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy | NewCarSuperstore",
  description: "How NewCarSuperstore handles your information when you shop, apply for credit, or contact us.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <SiteHeader />
      <main className="container-wide max-w-3xl py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">Privacy</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">
          We collect only the information needed to help you shop for a vehicle, connect you with financing partners, and respond to your
          requests. Details you submit on forms (for example lead requests or credit applications) are used to operate our service and may
          be shared with lenders or brokers involved in your deal, as described when you submit each form.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">
          For questions about your data, contact us using the phone number in the site header or the contact options in the footer. We may
          update this page as our practices evolve; the effective summary is: we use your information to provide the car-buying and
          financing services you ask for, not for unrelated marketing unless you opt in where applicable.
        </p>
        <p className="mt-6 text-xs text-ink-500">
          This is a concise shopper summary, not a substitute for any standalone privacy policy or legal agreement your business publishes
          elsewhere. Replace or extend this page with counsel-approved copy when ready.
        </p>
      </main>
    </div>
  );
}
