"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { api } from "@/lib/api";
import { navigateAfterSignIn } from "@/lib/post-auth-navigation";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstileToken } from "@/lib/verify-turnstile-client";
import { AlertCircle } from "lucide-react";
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
          <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
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
  const rawReturn = searchParams.get("returnUrl")?.trim() ?? "";
  const returnUrl = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/lease-specials";
  const hasDeepReturn = Boolean(rawReturn && rawReturn.startsWith("/") && !rawReturn.startsWith("//"));
  const approvalCode = searchParams.get("approval") ?? "";
  const { loginWithToken, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);

  useEffect(() => {
    const e = searchParams.get("email")?.trim();
    if (e) setEmail(e);
  }, [searchParams]);

  const canSubmit = useMemo(() => {
    const credsOk = emailSchema.safeParse(email).success && password.trim().length > 0;
    if (!isTurnstileEnabled()) return credsOk;
    return credsOk && Boolean(turnstileToken);
  }, [email, password, turnstileToken]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    if (!canSubmit) {
      setMessage("Enter a valid email and password.");
      return;
    }

    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        setMessage("Complete the security check below.");
        return;
      }
      const check = await verifyTurnstileToken(turnstileToken);
      if (!check.ok) {
        setMessage("Security check failed. Please try again.");
        setTurnstileToken(null);
        setTurnstileRemount((k) => k + 1);
        return;
      }
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
      setStatus("redirecting");
      navigateAfterSignIn(router, {
        role: userData?.role,
        returnUrl,
        approvalCode
      });
    } catch (error: any) {
      setMessage(error?.message ?? "Invalid email or password. Try again.");
      setStatus("idle");
    }
  };

  const isBusy = status === "loading" || status === "redirecting";

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <p className="text-sm text-ink-600">Use the email and password you set when you created your account.</p>
              {hasDeepReturn ? (
                <p className="text-xs text-ink-500">After you sign in, we&apos;ll return you to your previous page.</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <div
                  className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <span>{message}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    disabled={isBusy}
                  />
                </div>
                <TurnstileWidget
                  action="login"
                  remountKey={turnstileRemount}
                  onToken={setTurnstileToken}
                  className="flex justify-center"
                />
                <Button type="submit" disabled={!canSubmit || isBusy} className="w-full">
                  {status === "redirecting" ? "Redirecting..." : status === "loading" ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
