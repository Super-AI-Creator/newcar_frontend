"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { z } from "zod";

const emailSchema = z.string().email();

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel w-full max-w-xl bg-white">
            <CardContent className="py-10 text-center text-sm text-ink-600">Loading sign in...</CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/lease-specials";
  const approvalCode = searchParams.get("approval") ?? "";
  const { loginWithToken, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => emailSchema.safeParse(email).success && password.trim().length > 0,
    [email, password]
  );

  const handleSubmit = async () => {
    setMessage(null);
    if (!canSubmit) {
      setMessage("Enter a valid email and password.");
      return;
    }

    setStatus("loading");
    try {
      const data = await api.login(email, password);
      const token = data.token ?? null;
      if (!token) {
        setMessage("Login failed.");
        setStatus("idle");
        return;
      }
      loginWithToken(token, null);
      await refresh();
      const userData = await api.me();
      const role = userData?.role ?? "";
      if (role === "credit_union") {
        const base = "/dashboard/credit-union";
        const dest = approvalCode ? `${base}?claim=${encodeURIComponent(approvalCode)}` : base;
        router.replace(dest);
      } else {
        const base = returnUrl.startsWith("/") ? returnUrl : "/lease-specials";
        const sep = base.includes("?") ? "&" : "?";
        const dest = approvalCode ? `${base}${sep}claim=${encodeURIComponent(approvalCode)}` : base;
        router.replace(dest);
      }
    } catch (error: any) {
      setMessage(error?.message ?? "Login failed.");
      setStatus("idle");
    }
  };

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel w-full max-w-xl bg-white">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <div className="rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-sm text-ink-700">{message}</div>}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" />
              </div>
              <Button onClick={handleSubmit} disabled={!canSubmit || status === "loading"} className="w-full">
                {status === "loading" ? "Signing in..." : "Sign In"}
              </Button>
              <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
                New user?{" "}
                <Link href="/register" className="font-medium text-brand-700 hover:text-brand-800">
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
