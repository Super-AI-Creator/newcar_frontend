"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Link from "next/link";
import { Facebook, Instagram, MapPin, Phone, Plus, Twitter, Youtube } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_FOOTER = {
  facebook_url: "https://www.facebook.com/newcarsuperstore/",
  twitter_url: "https://twitter.com/autobrokerla",
  google_plus_url: "https://plus.google.com/101810114903929491113",
  instagram_url: "https://www.instagram.com/newcarsuperstore/",
  youtube_url: "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ",
  address_line: "2671 Ventura Blvd Suite Oxnard CA 93036",
  phone_line: "818.705.9200, 818.705.9202",
  footer_disclosure: "",
  copyright_line: "",
  link_lease_label: "Lease Specials Los Angeles",
  link_lease_url: "/lease-specials",
  link_broker_label: "Auto Broker Los Angeles",
  link_broker_url: "/most-reviewed-auto-broker-los-angeles",
};

/** Near-black bar (ink-950 added to tailwind.config; previously missing 950 broke bg and hid white text). */
const FOOTER_BG = "bg-ink-950";

function SocialLink({
  href,
  ariaLabel,
  children,
}: {
  href?: string | null;
  ariaLabel: string;
  children: ReactNode;
}) {
  const url = (href ?? "").trim();
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-brand-600 text-white shadow-sm transition hover:bg-brand-500"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {children}
    </a>
  );
}

function PhoneLine({ text }: { text: string }) {
  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-base text-white/95">
      <Phone className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span className="text-white/45">,</span> : null}
          <a href={`tel:${p.replace(/\D/g, "")}`} className="font-medium hover:text-brand-300 hover:underline">
            {p}
          </a>
        </span>
      ))}
    </span>
  );
}

function FooterNavLink({ href, label }: { href: string; label: string }) {
  const h = href.trim();
  const l = label.trim();
  if (!h || !l) return null;
  const external = h.startsWith("http://") || h.startsWith("https://");
  if (external) {
    return (
      <a href={h} className="text-white/90 hover:text-brand-300 hover:underline" target="_blank" rel="noreferrer noopener">
        {l}
      </a>
    );
  }
  return (
    <Link href={h} className="text-white/90 hover:text-brand-300 hover:underline">
      {l}
    </Link>
  );
}

export function SiteFooter({ poweredBy }: { poweredBy?: string }) {
  const { data } = useQuery({
    queryKey: ["landing-page"],
    queryFn: () => api.getLandingPage(),
  });

  const raw = data?.footer ?? {};
  const footer = { ...DEFAULT_FOOTER, ...raw };
  const year = new Date().getFullYear();

  const copyrightResolved = (() => {
    const custom = (footer.copyright_line ?? "").trim();
    if (custom) return custom.replace(/\{year\}/g, String(year));
    if (poweredBy) return null;
    return `© ${year} All rights reserved. Created by PTI WebTech`;
  })();

  const disclosure = (footer.footer_disclosure ?? "").trim();
  const address = (footer.address_line ?? "").trim();
  const phoneLine = (footer.phone_line ?? "").trim();

  return (
    <footer className={cn("border-t border-ink-800 text-white", FOOTER_BG)}>
      <div className="container-wide py-10">
        {/* Group contact + social so wide screens don’t look like an empty strip */}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center sm:gap-7">
          {(address || phoneLine) && (
            <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-4">
              {address ? (
                <span className="inline-flex max-w-lg items-start justify-center gap-2.5 text-base leading-snug text-white/95">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                  <span className="font-medium">{address}</span>
                </span>
              ) : null}
              {phoneLine ? <PhoneLine text={phoneLine} /> : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialLink href={footer.facebook_url} ariaLabel="Facebook">
              <Facebook className="h-[18px] w-[18px]" />
            </SocialLink>
            <SocialLink href={footer.twitter_url} ariaLabel="Twitter">
              <Twitter className="h-[18px] w-[18px]" />
            </SocialLink>
            <SocialLink href={footer.google_plus_url} ariaLabel="Google+">
              <Plus className="h-[18px] w-[18px]" />
            </SocialLink>
            <SocialLink href={footer.instagram_url} ariaLabel="Instagram">
              <Instagram className="h-[18px] w-[18px]" />
            </SocialLink>
            <SocialLink href={footer.youtube_url} ariaLabel="YouTube">
              <Youtube className="h-[18px] w-[18px]" />
            </SocialLink>
          </div>

          {disclosure ? (
            <p className="w-full max-w-3xl whitespace-pre-wrap px-1 text-center text-xs leading-relaxed text-white/70">{disclosure}</p>
          ) : null}
        </div>

        <div className="mx-auto mt-10 max-w-5xl border-t border-white/15 pt-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="flex flex-col items-center gap-1.5 text-center text-sm text-white/80 sm:items-start sm:text-left">
              {poweredBy ? (
                <>
                  <span className="text-base font-medium text-white">{poweredBy}</span>
                  {copyrightResolved ? <span className="text-xs text-white/55">{copyrightResolved}</span> : null}
                </>
              ) : copyrightResolved ? (
                <span className="text-base">{copyrightResolved}</span>
              ) : (
                <span className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo.png" alt="" className="h-5 w-auto opacity-90" loading="lazy" />
                  <span>Copyright {year} NewCarSuperstore</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-end">
              <FooterNavLink href={footer.link_lease_url} label={footer.link_lease_label} />
              {(footer.link_lease_label ?? "").trim() &&
              (footer.link_lease_url ?? "").trim() &&
              (footer.link_broker_label ?? "").trim() &&
              (footer.link_broker_url ?? "").trim() ? (
                <span className="px-1 text-white/40" aria-hidden>
                  |
                </span>
              ) : null}
              <FooterNavLink href={footer.link_broker_url} label={footer.link_broker_label} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
