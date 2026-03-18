import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import LandingPageSections from "@/components/landing-page-sections";
import { resolveSeoMetadata } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  return resolveSeoMetadata("home", {
    title: "Buy Any New Car in California Without the Dealership | NewCarSuperstore",
    description: "Shop statewide inventory, get approved fast, and have your new car delivered to your door.",
    openGraph: {
      title: "Buy Any New Car in California Without the Dealership | NewCarSuperstore",
      description: "Shop statewide inventory, get approved fast, and have your new car delivered to your door."
    }
  });
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <SiteHeader />

      <main>
        <LandingPageSections />
      </main>
      <SiteFooter />
    </div>
  );
}
