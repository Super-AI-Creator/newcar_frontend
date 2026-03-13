import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "@/components/providers";
import { resolveSeoMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
    title: "NewCarSuperstore",
    description: "Modern marketplace for new car deals."
  };
  try {
    return await resolveSeoMetadata("site_default", fallback);
  } catch {
    return fallback;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
