"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Facebook, Twitter, Instagram, Youtube, Plus } from "lucide-react";
import { api } from "@/lib/api";
// Logo is intentionally not used here because this footer matches the dark provider layout.

const DEFAULT_FOOTER = {
  facebook_url: "https://www.facebook.com/newcarsuperstore/",
  twitter_url: "https://twitter.com/autobrokerla",
  google_plus_url: "https://plus.google.com/101810114903929491113",
  instagram_url: "https://www.instagram.com/newcarsuperstore/",
  youtube_url: "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ",
};

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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {children}
    </a>
  );
}

export function SiteFooter({ poweredBy }: { poweredBy?: string }) {
  const { data } = useQuery({
    queryKey: ["landing-page"],
    queryFn: () => api.getLandingPage(),
  });

  const footer = data?.footer ?? DEFAULT_FOOTER;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-200 bg-white py-8">
      <div className="container-wide flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          {poweredBy ? (
            <span className="text-sm text-ink-500">{poweredBy}</span>
          ) : (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Platform logo"
                className="h-5 w-auto"
                loading="lazy"
              />
              <span className="text-sm text-ink-500">Copyright {year} NewCarSuperstore</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SocialLink href={footer.facebook_url} ariaLabel="Facebook">
            <Facebook className="h-4 w-4" />
          </SocialLink>
          <SocialLink href={footer.twitter_url} ariaLabel="Twitter">
            <Twitter className="h-4 w-4" />
          </SocialLink>
          <SocialLink href={footer.google_plus_url} ariaLabel="Google+">
            <Plus className="h-4 w-4" />
          </SocialLink>
          <SocialLink href={footer.instagram_url} ariaLabel="Instagram">
            <Instagram className="h-4 w-4" />
          </SocialLink>
          <SocialLink href={footer.youtube_url} ariaLabel="YouTube">
            <Youtube className="h-4 w-4" />
          </SocialLink>
        </div>
      </div>
    </footer>
  );
}

