import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeDollarSign,
  Building2,
  ChevronRight,
  CheckCircle2,
  Gauge,
  MapPin,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/site-header";
import Logo from "@/components/logo";
import LeaseSpecials from "@/components/lease-specials";
import HomeShopOptions from "@/components/home-shop-options";
import HomeTestimonials from "@/components/home-testimonials";
import LandingHeroCarousel from "@/components/landing-hero-carousel";
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
        <section className="relative overflow-hidden border-b border-ink-200 bg-ink-900">
          <div className="absolute inset-0">
            <LandingHeroCarousel className="h-full w-full" imageClassName="opacity-35" priority />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-900/80 to-brand-900/55" />
          <div className="container-wide relative py-12 sm:py-20 lg:py-24">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-w-3xl">
                <p className="whitespace-pre-wrap text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                  {"SHOP,  GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW"}
                </p>
                <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:mt-4 sm:text-5xl lg:text-6xl">
                  Buy Any New Car in California Without the Dealership
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:mt-4 sm:text-lg">
                  SHOP, GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW.
                </p>
                <div className="mt-5 grid gap-2 text-sm text-zinc-100 sm:grid-cols-3">
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    No dealer visits
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    Shop and compare online
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    Delivered to your door
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="rounded-xl">
                    <Link href="/search?vehicle_type=new">Find My Car</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20">
                    <a href="https://newcarsuperstore.typeform.com/to/lX0SiNPY" target="_blank" rel="noreferrer noopener">Trade in Value</a>
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="relative h-[320px] overflow-hidden rounded-2xl border border-white/25">
                    <LandingHeroCarousel className="h-full w-full" />
                    <div className="absolute right-4 top-4 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
                      Red Bow Delivery
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <HomeShopOptions />

        <section className="border-b border-ink-200 bg-white py-8 sm:py-10">
          <div className="container-wide">
            <h2 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">Current Lease Specials Los Angeles</h2>
            <p className="mt-1 text-sm text-ink-600">Shop and compare hundreds of lease offers, if they make it, we have it! 818-705-9200</p>
            <div className="mt-5">
              <LeaseSpecials />
            </div>
          </div>
        </section>

        <HomeTestimonials />

        <section className="border-b border-ink-200 bg-[#f8fafc] py-10 sm:py-12">
          <div className="container-wide">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Traditional Dealer vs NewCarSuperstore</h2>
            <p className="mt-2 text-sm text-ink-600">A faster way to buy without the dealership runaround.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-ink-200 bg-white p-6">
                <p className="text-sm font-semibold tracking-wide text-ink-500">The Old Way (Dealerships) 😩</p>
                <ul className="mt-4 space-y-3 text-sm text-ink-700">
                  <li className="inline-flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    Drive from dealership to dealership hoping someone has the car you want
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    Spend hours negotiating prices and “checking with the manager”
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    Sit in the finance office signing paperwork forever
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    Leave exhausted wondering if you got a good deal
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                <p className="text-sm font-semibold tracking-wide text-brand-700">The New Way (NewCarSuperstore)</p>
                <ul className="mt-4 space-y-3 text-sm text-ink-800">
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Shop inventory from dealers all across California
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Get instantly pre-approved for financing in minutes
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Complete everything online from home
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Your new car arrives at your door with a red bow
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-ink-200 bg-white py-10 sm:py-12">
          <div className="container-wide grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <BadgeDollarSign className="h-6 w-6 text-brand-700" />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Get Pre-Approved in Minutes</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                No awkward finance office. No pressure.
                Just a quick check to see real payment options before you fall in love with the car.
              </p>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <Building2 className="h-6 w-6 text-brand-700" />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Browse Cars All Over California</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Instead of driving dealership to dealership, browse real inventory from across the state — in your pajamas if you want.
              </p>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <ShieldCheck className="h-6 w-6 text-brand-700" />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Delivered to Your Door</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Once everything is approved, we handle the paperwork and deliver your new car straight to your home… with a red bow on it.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f8fafc] py-12">
          <div className="container-wide rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink-900">How it works</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                <div className="relative h-32 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                  <Image src="/images/hero-cars.jpg" alt="Browse statewide inventory" fill className="object-cover" />
                </div>
                <p className="mt-3 text-base font-semibold text-ink-900 sm:text-lg">Browse Statewide Inventory</p>
              </div>

              <div className="hidden md:flex md:justify-center">
                <ChevronRight className="h-8 w-8 text-ink-300" />
              </div>

              <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                <div className="relative h-32 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                  <Image src="/images/deal-1.jpg" alt="Get your best rate" fill className="object-cover" />
                </div>
                <p className="mt-3 text-base font-semibold text-ink-900 sm:text-lg">Get Your Best Rate</p>
              </div>

              <div className="hidden md:flex md:justify-center">
                <ChevronRight className="h-8 w-8 text-ink-300" />
              </div>

              <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                <div className="relative h-32 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                  <Image src="/images/landing_img (1).jpg" alt="Home delivery with a bow" fill className="object-cover object-center" />
                </div>
                <p className="mt-3 text-base font-semibold text-ink-900 sm:text-lg">Home Delivery With a Bow</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-ink-600">
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-700" />
                California coverage
              </p>
              <p className="inline-flex items-center gap-2">
                <Gauge className="h-4 w-4 text-brand-700" />
                Fast pre-approval flow
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-700" />
                End-to-end concierge support
              </p>
            </div>
          </div>
        </section>
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
