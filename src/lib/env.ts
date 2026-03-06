export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
  /** Typeform (or internal) lead form URL. */
  leadFormUrl:
    process.env.NEXT_PUBLIC_LEAD_FORM_URL ?? "https://newcarsuperstore.typeform.com/to/OaLM6DZV",
  /** Yelp business page for reviews. */
  yelpUrl: process.env.NEXT_PUBLIC_YELP_URL ?? "https://www.yelp.com/biz/new-car-superstore-los-angeles",
  /** Google Maps place URL for reviews. */
  googleMapsUrl:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ?? "https://www.google.com/maps/place/New+Car+Superstore",
  /** Optional: external auto loan calculator link. */
  loanCalculatorUrl:
    process.env.NEXT_PUBLIC_LOAN_CALCULATOR_URL ?? "https://www.bankrate.com/calculators/auto/auto-loan-calculator.aspx",
};
