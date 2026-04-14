import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import Providers from "@/components/providers";
import { resolveSeoMetadata } from "@/lib/seo";

/** GA4 measurement ID (override with NEXT_PUBLIC_GA_MEASUREMENT_ID). */
const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-3CG563JYV9";
/** Google Search Console HTML tag verification (override with NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION). */
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "BARs5p7wf3-Jpv2lad_nTzjQQHndHyc5E87JWXHMksg";

export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
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
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NXPDHCM6');`}
        </Script>
        {/* End Google Tag Manager */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-white text-ink-900 antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NXPDHCM6"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
