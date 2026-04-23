"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, type LandingHeroFallingPhrases, type LandingPageContentRecord, type Vehicle } from "@/lib/api";
import { normalizeLegacyPublicImageUrl } from "@/lib/landing-hero-slides";
import LandingHeroCarousel from "@/components/landing-hero-carousel";
import HeroFallingPhrases from "@/components/hero-falling-phrases";
import LeaseSpecials from "@/components/lease-specials";
import HomeShopOptions from "@/components/home-shop-options";
import HomeTestimonials from "@/components/home-testimonials";
import TradeInValueDialog from "@/components/trade-in-value-dialog";
import { HomeSeoIntroSection } from "@/components/marketing-seo-sections";
import { MarketingFaqSection } from "@/components/marketing-faq-section";
import { HOME_FAQ_ITEMS } from "@/content/marketing-faq";
import { BadgeDollarSign, Building2, ChevronRight, MapPin, Gauge, ShieldCheck } from "lucide-react";

const DEFAULT_HERO: {
  kicker: string;
  headline: string;
  subtext: string;
  slide_urls: string[];
  falling?: LandingHeroFallingPhrases;
} = {
  kicker: "SHOP,  GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW",
  headline: "Buy Any New Car in California Without the Dealership",
  subtext: "SHOP, GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW.",
  slide_urls: [
    "/images/landing-1.jpg",
    "/images/landing-2.jpg",
    "/images/landing-3.jpg",
    "/images/landing-4.jpg",
  ],
};
const DEFAULT_LEASE = { title: "Current Lease Specials Los Angeles", subtitle: "Shop and compare hundreds of lease offers, if they make it, we have it! 818-705-9200" };
const DEFAULT_HOW = [
  { image_url: "/images/hero-cars.jpg", label: "Browse Statewide Inventory", image_focus: "center" },
  { image_url: "/images/deal-1.jpg", label: "Get Your Best Rate", image_focus: "center" },
  { image_url: "/images/panel-cars.jpg", label: "Home Delivery With a Bow", image_focus: "center" },
];

/** SEO / accessibility copy for default hero photography (matches /images/landing-*.jpg). */
const LANDING_HERO_ALT_BY_FILE: Record<string, string> = {
  "landing-1.jpg": "A happy woman leans against a new red Subaru.",
  "landing-2.jpg": "A happy family posing with their new Honda Civic.",
  "landing-3.jpg": "Four people posing with thumbs up beside three cars.",
  "landing-4.jpg": "Two men shaking hands in front of a BMW."
};

function landingHeroSlideAlt(src: string, index: number): string {
  const path = normalizeLegacyPublicImageUrl(typeof src === "string" ? src : "");
  const file = path.split("/").pop()?.split("?")[0] ?? "";
  return LANDING_HERO_ALT_BY_FILE[file] ?? `Hero slide ${index + 1}`;
}

function SectionShimmerLine({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-ink-100 ${className}`} aria-hidden>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[landing-shimmer_1.8s_ease-in-out_infinite]" />
    </div>
  );
}

function HeroShimmerLine({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/10 ${className}`} aria-hidden>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:animate-[landing-shimmer_1.8s_ease-in-out_infinite]" />
    </div>
  );
}

/** Full hero placeholder: same overlays as live hero (brand gradient + photo-side dim). */
function HeroSectionSkeleton() {
  return (
    <div className="absolute inset-0 z-30 overflow-hidden" aria-busy aria-label="Loading hero">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-900/80 to-brand-900/55" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/45 via-black/15 to-transparent" />
      <div className="relative z-[2] container-wide py-8 sm:py-12 lg:py-16">
        <div className="grid items-center gap-8">
          <div className="max-w-3xl space-y-4">
            <HeroShimmerLine className="h-3 w-52 sm:w-64" />
            <HeroShimmerLine className="h-11 w-full max-w-xl sm:h-14" />
            <HeroShimmerLine className="h-11 w-[92%] max-w-lg sm:h-[3.25rem]" />
            <HeroShimmerLine className="h-4 w-full max-w-2xl" />
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              <HeroShimmerLine className="h-4 w-full" />
              <HeroShimmerLine className="h-4 w-full" />
              <HeroShimmerLine className="h-4 w-full" />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <HeroShimmerLine className="h-11 w-[10.5rem] rounded-xl sm:w-44" />
              <HeroShimmerLine className="h-11 w-36 rounded-xl sm:w-40" />
            </div>
            <HeroShimmerLine className="h-3 w-56 sm:w-72" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Homepage “featured offers” placeholder: same card anatomy as lease specials, different grid, shimmer + badge. */
function FeaturedOffersSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy aria-label="Loading featured offers">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-brand-200/35 bg-white shadow-[0_8px_30px_-12px_rgba(37,99,235,0.2)]"
        >
          <div className="relative aspect-[5/3] w-full overflow-hidden bg-gradient-to-br from-brand-50/90 via-ink-50 to-ink-100">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/65 to-transparent motion-safe:animate-[landing-shimmer_1.8s_ease-in-out_infinite]" />
            </div>
            <div className="absolute bottom-2.5 left-2.5 h-7 w-[4.5rem] overflow-hidden rounded-full bg-emerald-500/25 ring-1 ring-emerald-600/20">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent motion-safe:animate-[landing-shimmer_1.4s_ease-in-out_infinite]" />
            </div>
          </div>
          <div className="space-y-2.5 border-t border-ink-100/90 p-4">
            <SectionShimmerLine className="h-6 w-[90%]" />
            <SectionShimmerLine className="h-3.5 w-1/2" />
            <SectionShimmerLine className="h-3.5 w-2/5" />
            <SectionShimmerLine className="h-3.5 w-1/3" />
            <div className="flex gap-2 pt-1">
              <SectionShimmerLine className="h-9 min-w-0 flex-1 rounded-full" />
              <SectionShimmerLine className="h-9 w-[36%] min-w-[5.5rem] rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type FiltersPayload = {
  makes?: string[];
  models?: string[];
  trims?: string[];
  models_by_make?: Record<string, string[]>;
  trims_by_make_model?: Record<string, string[]>;
};

type SearchPayload = { results: Vehicle[]; total: number };

type Props = {
  initialLandingData?: LandingPageContentRecord;
  initialFilters?: FiltersPayload;
  initialSpecials?: SearchPayload;
  initialTestimonials?: Array<{
    id: string;
    quote: string;
    author: string;
    title?: string | null;
    image_url?: string | null;
  }>;
};

export default function LandingPageSections({
  initialLandingData,
  initialFilters,
  initialSpecials,
  initialTestimonials,
}: Props = {}) {
  const [heroImagesReady, setHeroImagesReady] = useState(false);
  const [heroUiMounted, setHeroUiMounted] = useState(false);
  useEffect(() => {
    setHeroUiMounted(true);
  }, []);
  const onHeroImagesReadyChange = useCallback((ready: boolean) => {
    setHeroImagesReady(ready);
  }, []);

  const { data } = useQuery({
    queryKey: ["landing-page"],
    queryFn: () => api.getLandingPage(),
    initialData: initialLandingData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const filtersQuery = useQuery({
    queryKey: ["home-shop-options-filters"],
    queryFn: () => api.getFilters({ vehicle_type: "new" }),
    initialData: initialFilters,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const specialsQuery = useQuery({
    queryKey: ["homepage-lease-specials"],
    queryFn: () => api.homepageSpecials({ limit: 6 }),
    initialData: initialSpecials,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const testimonialsQuery = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
    initialData: initialTestimonials,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const hero = data?.hero ?? DEFAULT_HERO;
  const lease = data?.lease ?? DEFAULT_LEASE;
  const how = data?.how_it_works?.length ? data.how_it_works : DEFAULT_HOW;
  const imageFocusToCss = (focus?: string) => {
    const v = (focus ?? "center").toLowerCase();
    if (v === "top") return "50% 0%";
    if (v === "bottom") return "50% 100%";
    if (v === "left") return "0% 50%";
    if (v === "right") return "100% 50%";
    return "50% 50%";
  };
  const slideUrlsRaw =
    (Array.isArray(hero.slide_urls) && hero.slide_urls.length ? hero.slide_urls : DEFAULT_HERO.slide_urls) ?? [];
  const slideUrls = slideUrlsRaw.map((u) => (typeof u === "string" ? normalizeLegacyPublicImageUrl(u) : u));
  const heroSlideFocus = (hero as { slide_focus?: string[] | undefined }).slide_focus;
  const defaultSlideFocus: string[] = ["center", "center", "center", "center"];
  const slideFocusRaw = Array.isArray(heroSlideFocus) && heroSlideFocus.length ? heroSlideFocus : defaultSlideFocus;
  const slides = slideUrls.map((src, i) => ({
    src,
    alt: landingHeroSlideAlt(src, i),
    focus: slideFocusRaw[i] ?? "center",
  }));
  const carouselSlides = slides;
  const showSpecialsSkeleton = specialsQuery.isPending && specialsQuery.data === undefined;
  const showHeroSkeleton = !heroUiMounted || !heroImagesReady;

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-200">
        {/* Split hero: flex guarantees 50/50 on md+ (no fragile inset overrides). Mobile = one column = full-width image. */}
        <div className="absolute inset-0 z-0 flex flex-row">
          <div
            className="hidden w-1/2 shrink-0 bg-ink-950 md:block"
            aria-hidden
          />
          <div className="relative min-h-0 w-full flex-1 md:w-1/2 md:shrink-0 md:flex-none">
            <LandingHeroCarousel
              className="absolute inset-0 h-full w-full min-h-0"
              imageClassName="opacity-85"
              priority
              slides={carouselSlides}
              onImagesReadyChange={onHeroImagesReadyChange}
            />
          </div>
        </div>
        {/* Brand tint (original hero look) */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-ink-950/90 via-ink-900/80 to-brand-900/55" />
        {/* Extra dim on the photo side so slides don’t read “washed out” */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-l from-black/45 via-black/15 to-transparent" />
        {showHeroSkeleton ? <HeroSectionSkeleton /> : null}
        <div className={`container-wide relative z-10 py-8 sm:py-12 lg:py-16 ${showHeroSkeleton ? "invisible" : ""}`} aria-hidden={showHeroSkeleton}>
          <div className="grid items-center gap-8">
            <div className="relative max-w-3xl">
              <HeroFallingPhrases config={hero.falling} />
              <div className="relative">
                <p className="whitespace-pre-wrap text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">{hero.kicker}</p>
                <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:mt-4 sm:text-5xl lg:text-6xl">{hero.headline}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:mt-4 sm:text-lg">{hero.subtext}</p>
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
                    <Link href="/lease-specials">Lease Specials</Link>
                  </Button>
                  <TradeInValueDialog />
                </div>
                <p className="mt-3 text-xs text-zinc-300/90">Most people finish browsing in a few minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <>
        <section className="border-b border-ink-200/80 bg-white/80 py-8 sm:py-10">
          <div className="container-wide">
            <h2 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">{lease.title}</h2>
            <p className="mt-1 text-sm text-ink-600">{lease.subtitle}</p>
            <div className="mt-5">
              {showSpecialsSkeleton ? <FeaturedOffersSkeleton /> : <LeaseSpecials initialSpecials={specialsQuery.data} />}
            </div>
          </div>
        </section>

        <HomeShopOptions initialFilters={filtersQuery.data} />

          <HomeTestimonials initialTestimonials={testimonialsQuery.data} />

          <section className="border-b border-ink-200/80 bg-luxury-pearl py-10 sm:py-12">
            <div className="container-wide">
              <h2 className="font-display text-2xl font-semibold text-ink-900">Traditional Dealer vs NewCarSuperstore</h2>
              <p className="mt-2 text-sm text-ink-600">A faster way to buy without the dealership runaround.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-ink-200/80 bg-white shadow-luxe-soft p-6">
                  <p className="text-sm font-semibold tracking-wide text-ink-500">The old way (dealerships)</p>
                  <ul className="mt-4 space-y-3 text-sm text-ink-700">
                    <li className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />Drive from dealership to dealership hoping someone has the car you want</li>
                    <li className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />Spend hours negotiating prices and “checking with the manager”</li>
                    <li className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />Sit in the finance office signing paperwork forever</li>
                    <li className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />Leave exhausted wondering if you got a good deal</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-luxury-champagne p-6 shadow-luxe-soft">
                  <p className="text-sm font-semibold tracking-wide text-brand-700">The New Way (NewCarSuperstore)</p>
                  <ul className="mt-4 space-y-3 text-sm text-ink-800">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />Shop inventory from dealers all across California</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />Get instantly pre-approved for financing in minutes</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />Complete everything online from home</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />Your new car arrives at your door with a red bow</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-ink-200/80 bg-white/85 py-10 sm:py-12">
            <div className="container-wide grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-ink-200/80 bg-white shadow-luxe-soft p-6">
                <BadgeDollarSign className="h-6 w-6 text-brand-700" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Get Pre-Approved in Minutes</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">No awkward finance office. No pressure. Just a quick check to see real payment options before you fall in love with the car.</p>
              </div>
              <div className="rounded-2xl border border-ink-200/80 bg-white shadow-luxe-soft p-6">
                <Building2 className="h-6 w-6 text-brand-700" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Browse Cars All Over California</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">Instead of driving dealership to dealership, browse real inventory from across the state — in your pajamas if you want.</p>
              </div>
              <div className="rounded-2xl border border-ink-200/80 bg-white shadow-luxe-soft p-6">
                <ShieldCheck className="h-6 w-6 text-brand-700" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Delivered to Your Door</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">Once everything is approved, we handle the paperwork and deliver your new car straight to your home… with a red bow on it.</p>
              </div>
            </div>
          </section>

          <section className="bg-luxury-pearl py-12">
            <div className="container-wide rounded-3xl border border-ink-200/80 bg-white shadow-luxe p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-900">How it works</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                {[0, 1, 2, 3, 4].map((cellIndex) => {
                  if (cellIndex % 2 === 1) {
                    return <div key={cellIndex} className="hidden md:flex md:justify-center"><ChevronRight className="h-8 w-8 text-ink-300" /></div>;
                  }
                  const stepIndex = cellIndex / 2;
                  const step = how[stepIndex];
                  if (!step) return null;
                  return (
                    <div key={cellIndex} className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                      <div className="relative h-32 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                        {step.image_url?.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={step.image_url}
                            alt={step.label ?? ""}
                            className="h-full w-full object-cover"
                            style={{ objectPosition: imageFocusToCss(step.image_focus) }}
                          />
                        ) : (
                          <Image
                            src={normalizeLegacyPublicImageUrl(step.image_url || "/images/hero-cars.jpg")}
                            alt={step.label ?? ""}
                            fill
                            className="object-cover"
                            style={{ objectPosition: imageFocusToCss(step.image_focus) }}
                          />
                        )}
                      </div>
                      <p className="mt-3 text-base font-semibold text-ink-900 sm:text-lg">{step.label}</p>
                    </div>
                  );
                })}
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

        <HomeSeoIntroSection />

        <MarketingFaqSection
          id="homepage-faq"
          heading="Frequently asked questions"
          kicker="Common questions about shopping statewide, leasing, financing, and delivery in California."
          items={HOME_FAQ_ITEMS}
          variant="pearl"
        />
      </>

      <style jsx global>{`
        @keyframes landing-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
