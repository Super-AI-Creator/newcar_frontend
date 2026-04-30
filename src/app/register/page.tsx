"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { api } from "@/lib/api";
import { navigateAfterSignIn } from "@/lib/post-auth-navigation";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstileToken } from "@/lib/verify-turnstile-client";
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
  const { loginWithToken, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<ReturnType<typeof randomCaptcha> | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);

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

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return null as { label: string; cls: string } | null;
    if (password.length < 8) return { label: "Use at least 8 characters", cls: "text-ink-500" };
    let score = 0;
    if (password.length >= 12) score++;
    else if (password.length >= 10) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (score >= 3) return { label: "Strong password", cls: "text-emerald-700" };
    if (score >= 1) return { label: "Medium — add numbers or symbols for strength", cls: "text-amber-700" };
    return { label: "Weak — mix upper, lower, numbers, or symbols", cls: "text-red-700" };
  }, [password]);

  const humanCheckOk = isTurnstileEnabled() ? Boolean(turnstileToken) : captchaValid;

  const canSubmit = useMemo(() => {
    const validEmail = emailSchema.safeParse(email).success;
    const validName = name.trim().length > 0;
    const validPassword = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    return validEmail && validName && validPassword && passwordsMatch && humanCheckOk && status === "idle";
  }, [email, name, password, confirmPassword, humanCheckOk, status]);

  const handleRegister = async () => {
    setMessage(null);
    if (!canSubmit) {
      setMessage(
        isTurnstileEnabled()
          ? "Fill all required fields, ensure passwords match, and complete the security check."
          : "Fill all required fields, ensure passwords match, and solve the security question."
      );
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
    } else if (!captchaValid) {
      setCaptchaError(true);
      setMessage("Please solve the security question correctly.");
      return;
    }

    setStatus("loading");
    try {
      const data = await api.register({
        email,
        name,
        password,
        phone: phone.trim() || undefined
      });
      const token = data.token ?? data.access_token;
      if (!token) {
        setMessage("Account created but sign-in failed. Please use Sign in below.");
        setStatus("idle");
        const r = searchParams.get("returnUrl")?.trim();
        const loginPath = r && r.startsWith("/") && !r.startsWith("//") ? `/login?returnUrl=${encodeURIComponent(r)}` : "/login";
        router.replace(loginPath);
        return;
      }
      loginWithToken(token, null);
      await refresh();
      const userData = await api.me();
      setStatus("redirecting");
      setMessage(null);
      const rawReturn = searchParams.get("returnUrl")?.trim() ?? "";
      const returnUrl =
        rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/lease-specials";
      const approvalCode = searchParams.get("approval") ?? "";
      navigateAfterSignIn(router, { role: userData?.role, returnUrl, approvalCode });
    } catch (error: any) {
      setMessage(error?.message ?? "Registration failed.");
      setStatus("idle");
    }
  };

  const fromLead = searchParams.get("from") === "lead";

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full overflow-x-hidden py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:py-12 sm:pb-12">
        <div className="container-wide flex flex-col items-center gap-6">
          <div className="w-full max-w-xl space-y-4 px-1 sm:px-0">
            <p className="text-sm leading-relaxed text-ink-800 sm:text-base">
              Register for a free account and enjoy a more personalized car shopping experience. Save your favorite vehicles,
              compare options, shop by monthly payment, browse by category, and pick up where you left off anytime.
            </p>
            <p className="text-sm leading-relaxed text-ink-700 sm:text-base">
              Your account makes it easier to find the right car, the right deal, and the right payment—all in one place.
            </p>
          </div>
          <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
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
                {passwordStrength ? (
                  <p className={`text-xs font-medium ${passwordStrength.cls}`}>{passwordStrength.label}</p>
                ) : null}
                <ul className="text-[11px] text-ink-500">
                  <li>8+ characters</li>
                  <li>Mix of letters and numbers recommended</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" />
              </div>

              {isTurnstileEnabled() ? (
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                      <ShieldCheck className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <h3 className="text-sm font-semibold text-ink-900">Security check</h3>
                      <p className="text-sm text-ink-600">Confirm you are human before creating your account.</p>
                      <TurnstileWidget
                        action="register"
                        remountKey={turnstileRemount}
                        onToken={setTurnstileToken}
                        className="flex justify-center sm:justify-start"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                      <ShieldCheck className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-ink-900">Quick human check</h3>
                        <p className="mt-0.5 text-sm text-ink-600">
                          A simple math question helps block automated signups. It is not a full captcha service.
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
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleRegister} disabled={!canSubmit || status !== "idle"}>
                  {status === "redirecting"
                    ? "Redirecting..."
                    : status === "loading"
                      ? "Creating account..."
                      : "Create account"}
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
          <main className="w-full overflow-x-hidden py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:py-12 sm:pb-12">
            <div className="container-wide flex justify-center">
              <Card className="market-panel lux-overlay w-full max-w-xl bg-white/95">
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
