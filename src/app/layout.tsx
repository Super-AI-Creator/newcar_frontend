import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import Providers from "@/components/providers";
import { resolveSeoMetadata } from "@/lib/seo";

const GOOGLE_TAG_ID = "G-5Z13V7V5JW";

export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
    title: "NewCarSuperstore",
    description: "Modern marketplace for new car deals.",
        verification: { google: "dfTayXP6rlPN93WVvLGm1aG6ryyp-uoFBlfUXkt8H2E" },
    icons: {
      icon: "/images/logo.png"
    }
  };
  try {
    const resolved = await resolveSeoMetadata("site_default", fallback);
    const resolvedIcons =
      typeof resolved.icons === "object" && resolved.icons !== null ? resolved.icons : undefined;
    return {
      ...resolved,
      icons: {
        ...(resolvedIcons ?? {}),
        icon: "/images/logo.png",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
