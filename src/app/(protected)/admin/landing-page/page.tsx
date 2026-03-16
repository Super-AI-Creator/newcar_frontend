"use client";

import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { LandingPageEditor } from "@/components/admin/landing-page-editor";
import { ArrowLeft } from "lucide-react";

export default function AdminLandingPage() {
  const { user } = useAuth();

  if (user?.role !== "super_admin") {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="app-main">
          <Card className="border-ink-200 bg-white">
            <CardContent className="py-10 text-center text-ink-600">Super Admin access required.</CardContent>
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
        </div>
        <LandingPageEditor />
      </main>
    </div>
  );
}
