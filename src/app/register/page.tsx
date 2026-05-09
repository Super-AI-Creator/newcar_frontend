"use client";

import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Member accounts are created only through a credit union invitation or pre-approval link.
 * This route remains for old bookmarks; there is no public signup form.
 */
export default function RegisterPage() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
            <CardHeader>
              <CardTitle>Member access</CardTitle>
              <p className="text-sm text-ink-600">
                Accounts are not created on this page. Your credit union sends a personal link or pre-approval link to
                open the member portal and set your password.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-600">
                Already have an account from your credit union?{" "}
                <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
