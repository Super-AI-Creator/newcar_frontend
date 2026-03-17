"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";

const emailSchema = z.string().email();

function randomCaptcha() {
  const a = 2;
  const b = 2;
  return { a, b, answer: a + b };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<ReturnType<typeof randomCaptcha> | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  // Pre-fill from URL (e.g. after Get Price lead submit).
  useEffect(() => {
    const n = searchParams.get("name")?.trim();
    const e = searchParams.get("email")?.trim();
    const p = searchParams.get("phone")?.trim();
    if (n) setName(n);
    if (e) setEmail(e);
    if (p) setPhone(p);
  }, [searchParams]);

  useEffect(() => {
    setCaptcha(randomCaptcha());
  }, []);

  const captchaValid = useMemo(() => {
    if (!captcha) return false;
    const n = parseInt(captchaInput.trim(), 10);
    return Number.isFinite(n) && n === captcha.answer;
  }, [captcha, captchaInput]);

  const canSubmit = useMemo(() => {
    const validEmail = emailSchema.safeParse(email).success;
    const validName = name.trim().length > 0;
    const validPassword = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    return validEmail && validName && validPassword && passwordsMatch && captchaValid && status !== "loading";
  }, [email, name, password, confirmPassword, captchaValid, status]);

  const handleRegister = async () => {
    setMessage(null);
    if (!canSubmit) {
      setMessage("Fill all required fields, ensure passwords match, and solve the security question.");
      return;
    }

    if (!captchaValid) {
      setCaptchaError(true);
      setMessage("Please solve the security question correctly.");
      return;
    }

    setStatus("loading");
    try {
      await api.register({
        email,
        name,
        password,
        phone: phone.trim() || undefined
      });
      setMessage("Registration complete. Redirecting to sign in...");
      const returnUrl = searchParams.get("returnUrl")?.trim();
      const loginPath = returnUrl && returnUrl.startsWith("/") ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
      setTimeout(() => router.replace(loginPath), 700);
    } catch (error: any) {
      setMessage(error?.message ?? "Registration failed.");
      setStatus("idle");
    }
  };

  const fromLead = searchParams.get("from") === "lead";

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel w-full max-w-xl bg-white">
            <CardHeader>
              <CardTitle>{fromLead ? "Create account to track your request" : "Create Account"}</CardTitle>
              {fromLead && (
                <p className="text-sm text-ink-600">We’ve pre-filled your details from your price request. Set a password to finish.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <div className="rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-sm text-ink-700">{message}</div>}
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" />
              </div>

              <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-900">Security check</h3>
                      <p className="mt-0.5 text-sm text-ink-600">
                        Please solve the simple math below so we know you&apos;re not a bot.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white px-4 py-2 font-mono text-lg font-semibold tabular-nums text-ink-900"
                        aria-hidden
                      >
                        {captcha ? `${captcha.a} + ${captcha.b} = ?` : "Loading..."}
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Your answer"
                        value={captchaInput}
                        onChange={(e) => {
                          setCaptchaInput(e.target.value);
                          setCaptchaError(false);
                        }}
                        className={`w-28 font-mono tabular-nums ${captchaError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        aria-label="Answer to the security question"
                        aria-invalid={captchaError}
                      />
                    </div>
                    {captchaError && (
                      <p className="text-sm font-medium text-red-600" role="alert">
                        Incorrect. Please try again.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleRegister} disabled={!canSubmit}>
                  {status === "loading" ? "Creating account..." : "Create account"}
                </Button>
              </div>
              <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Already registered?{" "}
                <Link
                  href={(() => {
                    const r = searchParams.get("returnUrl")?.trim();
                    return r && r.startsWith("/") ? `/login?returnUrl=${encodeURIComponent(r)}` : "/login";
                  })()}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="app-page min-h-screen">
          <SiteHeader />
          <main className="w-full py-8 sm:py-12">
            <div className="container-wide flex justify-center">
              <Card className="market-panel w-full max-w-xl bg-white">
                <CardContent className="py-10 text-center text-sm text-ink-600">Loading...</CardContent>
              </Card>
            </div>
          </main>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
