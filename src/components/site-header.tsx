"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  CarFront,
  ClipboardCheck,
  Heart,
  LayoutDashboard,
  Menu,
  MessageSquareQuote,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import Logo from "@/components/logo";

const publicBrandLinks = [
  { href: "/articles", label: "Articles" },
  { href: "/reviews", label: "Reviews" }
];

const customerLinks = [
  { href: "/dashboard/customer", label: "Dashboard" },
  { href: "/lease-specials", label: "Lease Specials" },
  { href: "/search?vehicle_type=used", label: "Used Cars" },
  { href: "/favorites", label: "Favorites" },
  { href: "/credit-application", label: "Credit Application" },
  { href: "/recommendations", label: "Best for you" },
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
  const role = user?.role ?? "guest";
  const isDealer = role === "dealer";
  const isAdmin = role === "admin" || role === "broker_admin" || role === "super_admin";
  const isCustomer = !!user && !isDealer && !isAdmin;

  const roleLinks = isAdmin ? adminLinks : isDealer ? dealerLinks : isCustomer ? customerLinks : guestLinks;
  const links = [...roleLinks, ...publicBrandLinks];
  const homeHref = isAdmin ? "/admin" : isDealer ? "/dashboard/dealer" : isCustomer ? "/dashboard/customer" : "/";
  const iconForHref = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/dashboard/customer") return LayoutDashboard;
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-white">
      <div className="container-wide flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={homeHref} className="flex shrink-0" aria-label="NewCarSuperstore home">
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
      <div className="hidden border-t border-ink-200 bg-white md:block">
        <div className="container-wide">
          <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto py-2" aria-label="Main navigation">
            {links.map(({ href, label }) => {
              const Icon = iconForHref(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isActiveLink(href)
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200 hover:text-ink-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
