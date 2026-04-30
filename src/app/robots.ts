import type { MetadataRoute } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

/**
 * SEO baseline:
 *   User-agent: *
 *   Allow: /
 *   Sitemap: {origin}/sitemap.xml
 */
export default function robots(): MetadataRoute.Robots {
  const base = getCanonicalSiteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`
  };
}
