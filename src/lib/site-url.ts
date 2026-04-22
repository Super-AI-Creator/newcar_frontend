/** Canonical public site origin (no trailing slash). May include `www` if misconfigured in env. */
export function getPublicSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = (process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, "")}`;
  return "https://newcarsuperstore.com";
}

/**
 * Apex origin for rel=canonical, sitemap, robots, and JSON-LD — strips `www.` from the marketing host.
 * Preview hosts (e.g. `*.vercel.app`) are left unchanged.
 */
export function getCanonicalSiteOrigin(): string {
  const raw = getPublicSiteUrl().trim();
  if (!raw) return "https://newcarsuperstore.com";
  try {
    const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(base);
    const host = url.hostname.toLowerCase();
    if (host.startsWith("www.") && host.length > 4) {
      url.hostname = host.slice(4);
    }
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return raw.replace(/^https:\/\/www\./i, "https://").replace(/\/$/, "");
  }
}
