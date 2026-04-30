"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { env } from "@/lib/env";

/** Keep credit-union referral when linking back into vehicle search. */
export function searchHrefWithCu(href: string, cuSlug: string) {
  if (!cuSlug || !href.startsWith("/search")) return href;
  const q = href.indexOf("?");
  const path = q === -1 ? href : href.slice(0, q);
  const sp = new URLSearchParams(q === -1 ? "" : href.slice(q + 1));
  sp.set("cu", cuSlug);
  const tail = sp.toString();
  return tail ? `${path}?${tail}` : path;
}

export default function MarketplaceStickyHeader({ cuSlug }: { cuSlug: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const { user } = useAuth();
  const title = env.marketplaceBrandTitle;
  const tagline = env.marketplaceBrandTagline;
  const dashHref = user ? "/dashboard/member" : "/login";
  const vehicleType = sp.get("vehicle_type") === "used" ? "used" : "new";
  const navLinks = [
    { href: "/", label: "Why PAB" },
    { href: "/lease-specials", label: "Compare" },
    { href: dashHref, label: "Dashboard" },
    { href: "/", label: "How It Works" },
    { href: searchHrefWithCu(`/search?vehicle_type=${vehicleType}`, cuSlug), label: "Find cars" },
  ];

  const active = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/search") return pathname === "/search";
    return pathname === base;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b2744] shadow-md">
      <div className="container-wide flex h-[52px] items-center justify-between gap-3 sm:h-14">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 -m-0.5 text-left ring-offset-2 ring-offset-[#0b2744] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90"
          aria-label="Home"
        >
          <div className="shrink-0 rounded-lg bg-white/95 px-1.5 py-1 ring-1 ring-black/5">
            <Logo />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold tracking-tight text-white sm:text-base">{title}</span>
            <span className="hidden truncate text-[11px] font-medium text-sky-200/90 sm:block">{tagline}</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Marketplace">
          {navLinks.map(({ href, label }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`rounded-md px-2.5 py-2 text-[13px] font-semibold transition sm:px-3 ${
                active(href) ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-screen w-[86vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-r border-ink-200 px-3 pb-4 pt-3">
            <DialogHeader className="mb-2 border-b border-ink-200 pb-2">
              <DialogTitle className="text-base">Menu</DialogTitle>
            </DialogHeader>
            <div className="mt-1 space-y-1">
              {navLinks.map(({ href, label }) => (
                <DialogClose asChild key={`m-${href}-${label}`}>
                  <Link
                    href={href}
                    className={`block rounded-lg border px-3 py-2.5 text-sm font-medium ${
                      active(href)
                        ? "border-brand-600 bg-brand-50 text-brand-900"
                        : "border-ink-200 bg-white text-ink-800"
                    }`}
                  >
                    {label}
                  </Link>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
