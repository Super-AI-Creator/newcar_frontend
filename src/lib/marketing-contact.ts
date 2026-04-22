import { env } from "@/lib/env";

/** Public contact points shown on marketing pages (override email via `NEXT_PUBLIC_CONTACT_EMAIL`). */
export const MARKETING_PHONE_DISPLAY = "818-705-9200";
export const MARKETING_PHONE_TEL = "+18187059200";
export const MARKETING_ADDRESS_LINE = "2671 Ventura Blvd Suite, Oxnard, CA 93036";

export function getMarketingContactEmail(): string {
  if (env.contactEmail) return env.contactEmail;
  return "info@newcarsuperstore.com";
}
