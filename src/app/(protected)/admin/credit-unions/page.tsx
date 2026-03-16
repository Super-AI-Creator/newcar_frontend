"use client";

import * as React from "react";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { CreditUnionsManager } from "@/components/admin/credit-unions-manager";
import { ArrowLeft } from "lucide-react";

export default function AdminCreditUnionsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="app-main">
          <Card className="border-ink-200 bg-white">
            <CardContent className="py-10 text-center text-ink-600">
              You need Super Admin access to manage Credit Unions.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Credit Unions</h1>
        </div>
        <CreditUnionsManager />
      </main>
    </div>
  );
}
