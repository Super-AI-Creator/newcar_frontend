/**
 * Schema.org JSON-LD for New Car Superstore (SEO baseline).
 * URLs follow production; `baseUrl` should come from `getCanonicalSiteOrigin()` / `getPublicSiteUrl()`.
 */

import { HOME_FAQ_ITEMS, LEASE_SPECIALS_FAQ_ITEMS } from "@/content/marketing-faq";

const LOGO_PATH = "/images/logo.png";

export function organizationJsonLd(baseUrl: string) {
  const origin = baseUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "New Car Superstore",
    url: `${origin}/`,
    logo: `${origin}${LOGO_PATH}`,
    sameAs: [
      "https://www.facebook.com/newcarsuperstore/",
      "https://x.com/autobrokerla",
      "https://www.instagram.com/newcarsuperstore/",
      "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ"
    ]
  };
}

export function localBusinessJsonLd(baseUrl: string) {
  const origin = baseUrl.replace(/\/$/, "");
  const businessId = `${origin}/#localbusiness`;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "New Car Superstore",
    image: `${origin}${LOGO_PATH}`,
    "@id": businessId,
    url: `${origin}/`,
    telephone: "+1-818-705-9200",
    address: {
      "@type": "PostalAddress",
      streetAddress: "2671 Ventura Blvd Oxnard",
      addressLocality: "Oxnard",
      addressRegion: "CA",
      postalCode: "93036",
      addressCountry: "US"
    },
    sameAs: [
      "https://www.facebook.com/newcarsuperstore/",
      "https://x.com/autobrokerla",
      "https://www.instagram.com/newcarsuperstore/",
      "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ"
    ]
  };
}

function faqItem(name: string, text: string) {
  return {
    "@type": "Question",
    name,
    acceptedAnswer: { "@type": "Answer", text }
  };
}

/** FAQPage for https://newcarsuperstore.com/ — matches visible homepage FAQ. */
export function homeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ_ITEMS.map((item) => faqItem(item.question, item.answer))
  };
}

/** FAQPage for https://newcarsuperstore.com/lease-specials — matches visible lease FAQ. */
export function leaseSpecialsFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LEASE_SPECIALS_FAQ_ITEMS.map((item) => faqItem(item.question, item.answer))
  };
}
