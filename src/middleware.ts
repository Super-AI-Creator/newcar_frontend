import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Lightweight edge bot friction — reduces naive scrapers and headless browsers.
 * For serious attacks, also use Vercel Firewall / WAF or Cloudflare in front of the site.
 *
 * BOT_PROTECTION_DISABLED=true — turns this off (emergency bypass).
 * BOT_PROTECTION_IN_DEV=true — run checks in `next dev` (default: off in development).
 */

const BLOCKED_UA_SUBSTRINGS = [
  "headlesschrome",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
  "scrapy",
  "python-requests",
  "aiohttp",
  "apache-httpclient"
];

/** Known automated tools site owners use; still bots but should not be blocked. */
const ALLOWLIST_UA_SUBSTRINGS = [
  "lighthouse",
  "pagespeed",
  "gtmetrix",
  "pingdom",
  "uptimerobot",
  "statuscake",
  "vercel-screenshot",
  "google-inspectiontool",
  "googlebot",
  "adsbot-google",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "linkedinbot"
];

function isProtectionActive(): boolean {
  if (process.env.BOT_PROTECTION_DISABLED === "true") return false;
  if (process.env.NODE_ENV !== "production" && process.env.BOT_PROTECTION_IN_DEV !== "true") {
    return false;
  }
  return true;
}

function isAllowlisted(normalizedUa: string): boolean {
  return ALLOWLIST_UA_SUBSTRINGS.some((s) => normalizedUa.includes(s));
}

function isBlockedBot(normalizedUa: string): boolean {
  if (!normalizedUa.trim()) return true;
  if (isAllowlisted(normalizedUa)) return false;
  return BLOCKED_UA_SUBSTRINGS.some((s) => normalizedUa.includes(s));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host === "www.newcarsuperstore.com") {
    const url = request.nextUrl.clone();
    url.hostname = "newcarsuperstore.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (!isProtectionActive()) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") ?? "";
  const normalized = ua.toLowerCase();

  if (isBlockedBot(normalized)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on pages and app routes; skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)"
  ]
};
