import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import Logo from "@/components/logo";
import LandingPageSections from "@/components/landing-page-sections";
import { resolveSeoMetadata } from "@/lib/seo";

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

      <footer className="border-t border-ink-200 bg-white py-8">
        <div className="container-wide flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo />
          <p className="text-sm text-ink-500">Copyright {new Date().getFullYear()} NewCarSuperstore</p>
        </div>
      </footer>
    </div>
  );
}
