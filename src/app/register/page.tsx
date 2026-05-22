"use client";

import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * New Car Superstore does not offer public self-registration.
 * Credit union member signup lives at /creditunions/join (CU invitation links only).
 */
export default function RegisterPage() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
            <CardHeader>
              <CardTitle>Account registration</CardTitle>
              <p className="text-sm text-ink-600">
                New Car Superstore does not create shopper accounts on this page. Submit a quote or contact request on the site and
                our team will follow up by phone or email.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-600">
                Already have a broker or staff login?{" "}
                <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
                  Sign in
                </Link>
              </p>
              <p className="text-sm text-ink-600">
                <Link href="/" className="font-medium text-brand-700 hover:text-brand-800">
                  Return to homepage
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
