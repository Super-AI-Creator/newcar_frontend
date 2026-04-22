function trimTrailingSlash(raw: string) {
  return raw.replace(/\/$/, "");
}

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
  /** Typeform (or internal) lead form URL. */
  leadFormUrl:
    process.env.NEXT_PUBLIC_LEAD_FORM_URL ?? "https://newcarsuperstore.typeform.com/to/OaLM6DZV",
  /** Yelp business page for reviews. */
  yelpUrl: process.env.NEXT_PUBLIC_YELP_URL ?? "https://www.yelp.com/biz/new-car-superstore-los-angeles",
  /** Google Maps / review link (share link from Google Maps). */
  googleMapsUrl:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ?? "https://share.google/Z1mmTk31IROIBonOj",
  /** Optional: external auto loan calculator link. */
  loanCalculatorUrl:
    process.env.NEXT_PUBLIC_LOAN_CALCULATOR_URL ?? "https://www.bankrate.com/calculators/auto/auto-loan-calculator.aspx",
  /** Sticky navy header on /search when `?cu=` credit-union referral is present. */
  marketplaceBrandTitle: process.env.NEXT_PUBLIC_MARKETPLACE_BRAND_TITLE ?? "Power Auto Buying",
  marketplaceBrandTagline:
    process.env.NEXT_PUBLIC_MARKETPLACE_BRAND_TAGLINE ?? "Credit Union Marketplace",
  /**
   * Standalone credit union member site (same Next app as `/cu/[slug]` on the portal host).
   * When set, marketing-site `/cu/[slug]` “Search cars” links open here so members never leave the CU web app.
   */
  cuPortalBaseUrl: trimTrailingSlash(
    (process.env.NEXT_PUBLIC_CU_PORTAL_BASE_URL ?? "").trim().replace(/^\/+/, "")
  ),
  /** Shown on /contact-us; defaults in `marketing-contact.ts` if unset. */
  contactEmail: (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim(),
};
