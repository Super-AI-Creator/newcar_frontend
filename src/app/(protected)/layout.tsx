"use client";

import { useAuth } from "@/components/auth-provider";
import { usePathname } from "next/navigation";
import { Loader } from "@/components/ui/loader";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const allowAnonymous =
    pathname === "/search" ||
    pathname === "/lease-specials" ||
    pathname?.startsWith("/vehicles/") ||
    pathname === "/reviews" ||
    pathname === "/credit-application" ||
    pathname === "/testimonials" ||
    pathname === "/most-reviewed-auto-broker-los-angeles";

  if (loading && !allowAnonymous) {
    return (
      <div className="app-page flex min-h-screen items-center justify-center">
        <Loader label="Checking session…" />
      </div>
    );
  }

  if (!user && !allowAnonymous) {
    return null;
  }

  return <>{children}</>;
}
