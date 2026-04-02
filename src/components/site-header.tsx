"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CarFront,
  ClipboardCheck,
  Heart,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadFormButton from "@/components/lead-form-button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import Logo from "@/components/logo";

const publicBrandLinks = [
  { href: "/articles", label: "Articles" },
  { href: "/reviews", label: "Reviews" }
];

const customerDealRoomLink = { href: "/dashboard/customer", label: "Deal Room" } as const;

const customerLinks = [
  customerDealRoomLink,
  { href: "/lease-specials", label: "Lease Specials" },
  { href: "/search?vehicle_type=new", label: "Find Cars" },
  { href: "/search?vehicle_type=used", label: "Used Cars" },
  { href: "/favorites", label: "Favorites" },
  { href: "/credit-application", label: "Credit Application" },
  { href: "/recommendations", label: "Recommended cars" },
  { href: "/prequal", label: "Shop by payment" }
];

const guestLinks = [
  { href: "/lease-specials", label: "Lease Specials" },
  { href: "/search?vehicle_type=new", label: "Find Cars" },
  { href: "/search?vehicle_type=used", label: "Used Cars" }
];

const dealerLinks = [
  { href: "/dashboard/dealer", label: "Dealer Workspace" },
  { href: "/search", label: "Inventory Search" }
];

const adminLinks = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin Workspace" },
  { href: "/search", label: "All Vehicles" }
];

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role ?? "guest";
  const isDealer = role === "dealer";
  const isAdmin = role === "admin" || role === "broker_admin" || role === "super_admin";
  const isCustomer = !!user && !isDealer && !isAdmin;
  const [customQuoteReady, setCustomQuoteReady] = useState(false);

  const roleLinks = isAdmin ? adminLinks : isDealer ? dealerLinks : isCustomer ? customerLinks : guestLinks;
  const links = [...roleLinks, ...publicBrandLinks];
  const desktopNavLinks = isCustomer ? links.filter((l) => l.href !== customerDealRoomLink.href) : links;
  const homeHref = isAdmin ? "/admin" : isDealer ? "/dashboard/dealer" : "/";
  /** Logged-in shoppers always land on marketing home `/` (not dashboard) so the logo works as “Home” from Deal Room. */
  const logoHref = isCustomer ? "/" : homeHref;
  const hideBack = pathname === "/" || pathname === homeHref;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(homeHref);
  };
  const iconForHref = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/dashboard/customer") return MessageSquare;
    if (base === "/lease-specials") return BadgeDollarSign;
    if (base === "/search") return Search;
    if (base === "/favorites") return Heart;
    if (base === "/credit-application") return ClipboardCheck;
    if (base === "/recommendations") return Sparkles;
    if (base === "/prequal") return ShoppingBag;
    if (base === "/reviews") return MessageSquareQuote;
    if (base === "/dashboard/dealer") return CarFront;
    if (base === "/admin") return Star;
    return Search;
  };
  const isActiveLink = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/search") return pathname === "/search";
    return pathname === base || pathname.startsWith(`${base}/`);
  };
  const showFloatingDealRoom = isCustomer && !isActiveLink(customerDealRoomLink.href);
  const showGuestCustomQuote = !user && customQuoteReady;

  useEffect(() => {
    if (user) {
      setCustomQuoteReady(false);
      return;
    }
    setCustomQuoteReady(false);
    const timer = window.setTimeout(() => setCustomQuoteReady(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [user]);

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-ink-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-wide flex h-14 items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {!hideBack ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full p-0"
              aria-label="Go back"
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <Link
            href={logoHref}
            className="relative z-10 flex min-w-0 shrink-0 items-center rounded-md p-1 -m-0.5 ring-offset-2 transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="NewCarSuperstore home"
            title="Home"
            prefetch={isCustomer ? false : undefined}
          >
            <Logo />
          </Link>
          <a
            href="tel:18187059200"
            className="hidden text-sm font-semibold text-ink-800 sm:inline-block"
          >
            818-705-9200
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isCustomer ? (
            <Button asChild size="sm" className="h-9 rounded-full px-3 md:hidden">
              <Link href={customerDealRoomLink.href}>
                <MessageSquare className="mr-1 h-4 w-4" />
                Deal Room
              </Link>
            </Button>
          ) : null}
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden rounded-full px-4 md:inline-flex">
                <Link href="/settings">Profile</Link>
              </Button>
              <span
                className="hidden max-w-[160px] truncate text-sm text-ink-500 md:inline"
                title={user.email ?? undefined}
              >
                {user.email ?? user.name ?? "Member"}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="hidden rounded-full px-5 md:inline-flex">
                Sign out
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="outline" size="sm" className="rounded-full px-5">
                <Link href="/register">Register</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 rounded-full p-0 md:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="left-0 top-0 h-screen w-[86vw] max-w-[330px] translate-x-0 translate-y-0 rounded-none px-3 pb-4 pt-3">
              <DialogHeader className="mb-2 border-b border-ink-200 pb-2">
                <DialogTitle className="text-base">Menu</DialogTitle>
              </DialogHeader>
              <div className="mt-1 space-y-1.5">
                {showGuestCustomQuote ? (
                  <LeadFormButton
                    title="Custom Quote"
                    source="mobile_menu_custom_quote"
                  formHeading="Get a Custom Quote"
                  formIntro="Tell us the make and model you want, and our team will build a custom quote for you. Your information stays private and helps us match you with the best pricing and availability."
                    requireVehicleInput
                    vehicleInputLabel="Make and Model"
                    vehicleInputPlaceholder="Please enter the make and model car you want a custom quote for"
                    className="inline-flex h-auto w-full items-center justify-start gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium text-ink-700"
                    variant="ghost"
                  >
                    <MessageSquareQuote className="h-4 w-4" />
                    Custom Quote
                  </LeadFormButton>
                ) : null}
                {links.map(({ href, label }) => {
                  const Icon = iconForHref(href);
                  return (
                    <DialogClose asChild key={href}>
                      <Link
                        href={href}
                        className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                          isActiveLink(href)
                            ? "border-brand-600 bg-brand-50 text-brand-800"
                            : "border-ink-200 bg-white text-ink-700 active:bg-ink-100"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </DialogClose>
                  );
                })}
              </div>
              <div className="mt-3 space-y-2 border-t border-ink-200 pt-3">
                {user ? (
                  <>
                    <p className="truncate rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                      {user.email ?? user.name ?? "Member"}
                    </p>
                    <DialogClose asChild>
                      <Link
                        href="/settings"
                        className="inline-flex h-10 w-full items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-medium text-ink-800 hover:bg-ink-50"
                      >
                        Account & profile
                      </Link>
                    </DialogClose>
                    <Button variant="outline" onClick={logout} className="h-10 w-full rounded-full">
                      Sign out
                    </Button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <DialogClose asChild>
                      <Button asChild variant="outline" className="h-10 rounded-full">
                        <Link href="/register">Register</Link>
                      </Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button asChild className="h-10 rounded-full">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </DialogClose>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="hidden border-t border-ink-200/80 bg-white/90 md:block">
        <div className="container-wide">
          <nav className="flex items-center gap-2 py-2" aria-label="Main navigation">
            {isCustomer ? (
              <Link
                href={customerDealRoomLink.href}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  isActiveLink(customerDealRoomLink.href)
                    ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-luxe-soft"
                    : "bg-white text-ink-700 border border-ink-200/80 hover:bg-luxury-pearl hover:text-ink-900"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {customerDealRoomLink.label}
              </Link>
            ) : null}
            <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {showGuestCustomQuote ? (
                <LeadFormButton
                  title="Custom Quote"
                  source="site_header_custom_quote"
                  formHeading="Get a Custom Quote"
                  formIntro="Tell us the make and model you want, and our team will build a custom quote for you. Your information stays private and helps us match you with the best pricing and availability."
                  requireVehicleInput
                  vehicleInputLabel="Make and Model"
                  vehicleInputPlaceholder="Please enter the make and model car you want a custom quote for"
                  className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium lg:inline-flex"
                  size="sm"
                >
                  <MessageSquareQuote className="h-3.5 w-3.5" />
                  Custom Quote
                </LeadFormButton>
              ) : null}
              {desktopNavLinks.map(({ href, label }) => {
                const Icon = iconForHref(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      isActiveLink(href)
                        ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-luxe-soft"
                        : "bg-white text-ink-700 border border-ink-200/80 hover:bg-luxury-pearl hover:text-ink-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </header>
    {showFloatingDealRoom ? (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] md:hidden">
        <Button
          asChild
          size="sm"
          className="pointer-events-auto h-11 rounded-full bg-gradient-to-r from-red-500 to-red-400 px-5 text-base font-semibold text-white shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
        >
          <Link href={customerDealRoomLink.href}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Deal room
          </Link>
        </Button>
      </div>
    ) : null}
    {showGuestCustomQuote ? (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] md:hidden">
        <LeadFormButton
          title="Custom Quote"
          source="floating_custom_quote"
          formHeading="Get a Custom Quote"
          formIntro="Tell us the make and model you want, and our team will build a custom quote for you. Your information stays private and helps us match you with the best pricing and availability."
          requireVehicleInput
          vehicleInputLabel="Make and Model"
          vehicleInputPlaceholder="Please enter the make and model car you want a custom quote for"
          size="sm"
          className="pointer-events-auto h-14 w-14 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 p-0 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]"
        >
          <MessageSquareQuote className="h-6 w-6" />
        </LeadFormButton>
      </div>
    ) : null}
    </>
  );
}
