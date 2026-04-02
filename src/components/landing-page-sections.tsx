"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { api, type LandingHeroFallingPhrases } from "@/lib/api";
import LandingHeroCarousel from "@/components/landing-hero-carousel";
import HeroFallingPhrases from "@/components/hero-falling-phrases";
import LeaseSpecials from "@/components/lease-specials";
import HomeShopOptions from "@/components/home-shop-options";
import HomeTestimonials from "@/components/home-testimonials";
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
  slide_urls: ["/images/panel-cars.jpg", "/images/landing_img (2).jpg", "/images/landing_img (3).jpg", "/images/landing_img (4).jpg"],
};
const DEFAULT_LEASE = { title: "Current Lease Specials Los Angeles", subtitle: "Shop and compare hundreds of lease offers, if they make it, we have it! 818-705-9200" };
const DEFAULT_HOW = [
  { image_url: "/images/hero-cars.jpg", label: "Browse Statewide Inventory", image_focus: "center" },
  { image_url: "/images/deal-1.jpg", label: "Get Your Best Rate", image_focus: "center" },
  { image_url: "/images/panel-cars.jpg", label: "Home Delivery With a Bow", image_focus: "center" },
];

function ShimmerBlock({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/8 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-[landing-shimmer_1.8s_ease-in-out_infinite]" />
    </div>
  );
}

function LandingPageLoader() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,transparent_28%),radial-gradient(circle_at_bottom_right,#0f172a_0%,transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#172554_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] motion-safe:animate-[landing-shimmer_2.2s_ease-in-out_infinite]" />
      <div className="container-wide relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-10">
        <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.28),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_42%)]" />
          <div className="relative z-10">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-100">
              <Sparkles className="h-3.5 w-3.5" />
              Building your landing page
            </div>
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-brand-300 motion-safe:animate-pulse" />
              <span className="h-3 w-3 rounded-full bg-brand-400 motion-safe:animate-pulse [animation-delay:180ms]" />
              <span className="h-3 w-3 rounded-full bg-brand-500 motion-safe:animate-pulse [animation-delay:360ms]" />
            </div>
            <p className="mt-6 text-center font-display text-3xl font-semibold text-white sm:text-5xl">
              Loading the best deals for you
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-zinc-200 sm:text-lg">
              We are preparing the hero, search tools, reviews, and lease content so everything appears together beautifully.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
                <div className="flex items-center justify-between">
                  <ShimmerBlock className="h-4 w-40" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100/80">Syncing</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 motion-safe:animate-[landing-progress_2.8s_ease-in-out_infinite]" />
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    "Loading hero message",
                    "Preparing payment search",
                    "Checking reviews and specials",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left motion-safe:animate-[landing-float_3.4s_ease-in-out_infinite]"
                      style={{ animationDelay: `${index * 180}ms` }}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-400/15 text-brand-100">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{item}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-300/80 to-white/80 motion-safe:animate-[landing-shimmer_1.9s_ease-in-out_infinite]"
                            style={{ width: `${70 + index * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-5">
                <div className="flex items-center justify-between">
                  <ShimmerBlock className="h-4 w-32" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100/80">Almost ready</span>
                </div>
                <div className="relative mt-6 flex h-[16rem] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.22),transparent_52%)]">
                  <div className="absolute h-44 w-44 rounded-full border border-brand-200/20 motion-safe:animate-[landing-spin_12s_linear_infinite]" />
                  <div className="absolute h-32 w-32 rounded-full border border-brand-300/25 motion-safe:animate-[landing-spin-reverse_9s_linear_infinite]" />
                  <div className="absolute h-20 w-20 rounded-full border border-white/20" />
                  <div className="absolute h-3 w-3 rounded-full bg-brand-300 shadow-[0_0_20px_rgba(96,165,250,0.9)] motion-safe:animate-[landing-orbit_4s_linear_infinite]" />
                  <div className="absolute h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.7)] motion-safe:animate-[landing-orbit_6s_linear_infinite_reverse]" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur">
                    <div className="relative h-12 w-12 motion-safe:animate-pulse">
                      <Image
                        src="/images/logo1.png"
                        alt="NewCarSuperstore"
                        fill
                        sizes="48px"
                        className="object-contain drop-shadow-[0_4px_14px_rgba(255,255,255,0.35)]"
                        priority
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center motion-safe:animate-[landing-float_3.2s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 160}ms` }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.16em] text-brand-100/70">Stage {i + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{["Hero", "Search", "Reviews"][i]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPageSections() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { data, isPending } = useQuery({
    queryKey: ["landing-page"],
    queryFn: () => api.getLandingPage(),
  });
  const filtersQuery = useQuery({
    queryKey: ["home-shop-options-filters"],
    queryFn: () => api.getFilters({ vehicle_type: "new" }),
  });
  const specialsQuery = useQuery({
    queryKey: ["homepage-lease-specials"],
    queryFn: () => api.homepageSpecials({ limit: 6 }),
  });
  const testimonialsQuery = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
  });
  const waitingForLandingData = isPending && data === undefined;

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
  const slideUrls = (Array.isArray(hero.slide_urls) && hero.slide_urls.length ? hero.slide_urls : DEFAULT_HERO.slide_urls) ?? [];
  const heroSlideFocus = (hero as { slide_focus?: string[] | undefined }).slide_focus;
  const defaultSlideFocus: string[] = ["center", "center", "center", "center"];
  const slideFocusRaw = Array.isArray(heroSlideFocus) && heroSlideFocus.length ? heroSlideFocus : defaultSlideFocus;
  const slides = slideUrls.map((src, i) => ({
    src,
    alt: `Slide ${i + 1}`,
    focus: slideFocusRaw[i] ?? "center",
  }));
  const carouselSlides = slides;
  const landingImageUrls = useMemo(
    () =>
      Array.from(
        new Set(
          [...slideUrls, ...how.map((step) => step.image_url).filter((src): src is string => !!src)]
            .map((src) => src.trim())
            .filter(Boolean)
        )
      ),
    [slideUrls, how]
  );
  const landingAssetSignature = landingImageUrls.join("\0");
  const [landingAssetsReady, setLandingAssetsReady] = useState(false);

  useEffect(() => {
    if (waitingForLandingData) {
      setLandingAssetsReady(false);
      return;
    }
    if (landingImageUrls.length === 0) {
      setLandingAssetsReady(true);
      return;
    }

    let cancelled = false;
    setLandingAssetsReady(false);

    const preloadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    Promise.all(landingImageUrls.map(preloadImage)).then(() => {
      if (!cancelled) setLandingAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [waitingForLandingData, landingAssetSignature]);

  const waitingForSectionData =
    filtersQuery.isPending ||
    specialsQuery.isPending ||
    testimonialsQuery.isPending ||
    filtersQuery.data === undefined ||
    specialsQuery.data === undefined ||
    testimonialsQuery.data === undefined;
  const showLandingLoader = !hasHydrated || waitingForLandingData || !landingAssetsReady || waitingForSectionData;

  if (showLandingLoader) {
    return (
      <>
        <LandingPageLoader />
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

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0">
          <LandingHeroCarousel className="h-full w-full" imageClassName="opacity-85" priority slides={carouselSlides} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-900/80 to-brand-900/55" />
        <div className="container-wide relative py-12 sm:py-20 lg:py-24">
          <div className="grid items-center gap-8">
            <div className="relative max-w-3xl">
              <HeroFallingPhrases config={hero.falling} />
              <div className="relative z-10">
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
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-white/60 bg-white/10 text-white shadow-sm hover:border-white hover:bg-white hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                >
                  <a href="https://newcarsuperstore.typeform.com/to/lX0SiNPY" target="_blank" rel="noreferrer noopener">Trade in Value</a>
                </Button>
              </div>
              <p className="mt-3 text-xs text-zinc-300/90">Most people finish browsing in a few minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <>
        <HomeShopOptions initialFilters={filtersQuery.data} />

          <section className="border-b border-ink-200/80 bg-white/80 py-8 sm:py-10">
            <div className="container-wide">
              <h2 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">{lease.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{lease.subtitle}</p>
              <div className="mt-5">
                <LeaseSpecials initialSpecials={specialsQuery.data} />
              </div>
            </div>
          </section>

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
                            src={step.image_url || "/images/hero-cars.jpg"}
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
      </>

      <style jsx global>{`
        @keyframes landing-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes landing-progress {
          0%,
          100% {
            transform: translateX(-35%);
            width: 42%;
          }
          50% {
            transform: translateX(115%);
            width: 58%;
          }
        }
        @keyframes landing-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes landing-spin {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes landing-spin-reverse {
          100% {
            transform: rotate(-360deg);
          }
        }
        @keyframes landing-orbit {
          0% {
            transform: rotate(0deg) translateX(72px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(72px) rotate(-360deg);
          }
        }
      `}</style>
    </>
  );
}
