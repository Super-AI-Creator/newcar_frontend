export const SEO_PRESET_PAGE_KEYS = [
  "site_default",
  "home",
  "search",
  "lease_specials",
  "reviews",
  "credit_application",
] as const;

export type SeoJsonLdStarter = { id: string; label: string; template: string };

export const SEO_JSON_LD_STARTERS: SeoJsonLdStarter[] = [
  { id: "_", label: "Starter template (paste, then edit)", template: "" },
  {
    id: "org",
    label: "Organization",
    template: `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "NewCarSuperstore",
  "url": "https://www.newcarsuperstore.com"
}`,
  },
  {
    id: "local",
    label: "LocalBusiness (auto dealer style)",
    template: `{
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  "name": "NewCarSuperstore",
  "url": "https://www.newcarsuperstore.com",
  "telephone": "+1-818-705-9200",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Oxnard",
    "addressRegion": "CA",
    "postalCode": "93036",
    "streetAddress": "2671 Ventura Blvd Suite"
  }
}`,
  },
  {
    id: "website",
    label: "WebSite + SearchAction",
    template: `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "NewCarSuperstore",
  "url": "https://www.newcarsuperstore.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.newcarsuperstore.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}`,
  },
];
