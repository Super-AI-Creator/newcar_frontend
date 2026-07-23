import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import Providers from "@/components/providers";
import { JsonLd } from "@/components/json-ld";
import { localBusinessJsonLd, organizationJsonLd } from "@/lib/json-ld/newcarsuperstore";
import { resolveSeoMetadata } from "@/lib/seo";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

/** Google Tag Manager container ID (override with NEXT_PUBLIC_GTM_ID). */
const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-NXPDHCM6";
/** GA4 measurement ID (override with NEXT_PUBLIC_GA_MEASUREMENT_ID). */
const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-5Z13V7V5JW";
/** Google Search Console HTML tag verification (override with NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION). */
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "BARs5p7wf3-Jpv2lad_nTzjQQHndHyc5E87JWXHMksg";

const GTM_HEAD_SNIPPET = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const apex = new URL(`${getCanonicalSiteOrigin()}/`);
  const fallback: Metadata = {
    metadataBase: apex,
    title: "NewCarSuperstore",
    description: "Modern marketplace for new car deals.",
    icons: {
      icon: "/images/logo.png"
    },
    verification: {
      google: GOOGLE_SITE_VERIFICATION
    }
  };
  try {
    const resolved = await resolveSeoMetadata("site_default", fallback);
    const resolvedIcons =
      typeof resolved.icons === "object" && resolved.icons !== null ? resolved.icons : undefined;
    const resolvedVerification =
      typeof resolved.verification === "object" && resolved.verification !== null
        ? resolved.verification
        : {};
    return {
      ...resolved,
      metadataBase: apex,
      icons: {
        ...(resolvedIcons ?? {}),
        icon: "/images/logo.png",
      },
      verification: {
        ...resolvedVerification,
        google: GOOGLE_SITE_VERIFICATION
      }
    };
  } catch {
    return fallback;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const site = getCanonicalSiteOrigin();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://newcar-backend.vercel.app" />
        <link rel="dns-prefetch" href="https://newcar-backend.vercel.app" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <JsonLd data={organizationJsonLd(site)} />
        <JsonLd data={localBusinessJsonLd(site)} />
        <Script id="google-tag-manager" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: GTM_HEAD_SNIPPET }} />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-[100dvh] min-h-screen overflow-x-clip bg-white text-ink-900 antialiased">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height={0}
            width={0}
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
