"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { navigateAfterSignIn } from "@/lib/post-auth-navigation";
import { z } from "zod";

const emailSchema = z.string().email();

export default function CreditUnionJoinPage() {
  return (
    <Suspense fallback={null}>
      <CreditUnionJoinContent />
    </Suspense>
  );
}

function CreditUnionJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken, refresh } = useAuth();
  const token = searchParams.get("token") ?? "";
  const approvalCode = searchParams.get("approval") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const cuQuery = useQuery({
    queryKey: ["credit-union-by-token", token],
    queryFn: () => api.getCreditUnionByToken(token),
    enabled: !!token.trim(),
  });

  const cu = cuQuery.data;
  const isLoadingCu = cuQuery.isLoading;
  const invalidToken = !token.trim() || (!isLoadingCu && !cu);

  const canRequestOtp = useMemo(() => {
    const validEmail = emailSchema.safeParse(email).success;
    const validName = name.trim().length > 0;
    const validPassword = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    const validPhone = channel === "email" || phone.trim().length > 0;
    return validEmail && validName && validPassword && passwordsMatch && validPhone;
  }, [email, name, password, confirmPassword, channel, phone]);

  const requestOtp = async () => {
    setMessage(null);
    if (!canRequestOtp || !token.trim()) return;
    setStatus("loading");
    try {
      await api.requestOtp({
        email,
        name,
        password,
        phone: phone.trim() || undefined,
        channel,
        cu_signup_token: token,
      });
      setOtpSent(true);
      setMessage("Verification code sent. Enter it below.");
    } catch (error: unknown) {
      setMessage((error as { message?: string })?.message ?? "Could not send code.");
    } finally {
      setStatus("idle");
    }
  };

  const verifyOtp = async () => {
    setMessage(null);
    if (!otp.trim()) {
      setMessage("Enter the code we sent you.");
      return;
    }
    setStatus("loading");
    try {
      const data = await api.verifyOtp(email, otp, channel, token);
      const authToken = data.token ?? data.access_token;
      if (!authToken) {
        setMessage("Verified, but sign-in failed. Please use Sign in.");
        setStatus("idle");
        const returnUrl = cu?.slug ? `/cu/${cu.slug}` : "/dashboard/customer";
        const loginUrl =
          approvalCode
            ? `/login?returnUrl=${encodeURIComponent(returnUrl)}&approval=${encodeURIComponent(approvalCode)}`
            : `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
        router.replace(loginUrl);
        return;
      }
      loginWithToken(authToken, null);
      await refresh();
      const userData = await api.me();
      setStatus("redirecting");
      setMessage(null);
      const returnUrl = cu?.slug ? `/cu/${cu.slug}` : "/dashboard/customer";
      navigateAfterSignIn(router, { role: userData?.role, returnUrl, approvalCode });
    } catch (error: unknown) {
      setMessage((error as { message?: string })?.message ?? "Verification failed.");
      setStatus("idle");
    }
  };

  if (invalidToken) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="w-full py-12 flex justify-center">
          <Card className="max-w-md border-ink-200 bg-white">
            <CardContent className="py-10 text-center text-ink-600">
              <p>This signup link is invalid or expired.</p>
              <Button asChild className="mt-4">
                <Link href="/">Go to home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="w-full py-8 sm:py-12">
        <div className="container-wide flex justify-center">
          <Card className="market-panel w-full max-w-xl bg-white">
            <CardHeader className="border-b border-ink-100">
              <div className="flex items-center gap-4">
                {cu?.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cu.logo_url} alt={cu.name ?? ""} className="h-8 w-auto object-contain" />
                )}
                <CardTitle className="text-xl">{cu?.name ?? "Credit Union"} ? Member signup</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {message && (
                <div className="rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-sm text-ink-700">
                  {message}
                </div>
              )}
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone (required for SMS)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
              <div className="space-y-2">
                <Label>Verification</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as "email" | "sms")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline" onClick={requestOtp} disabled={!canRequestOtp || status === "loading"}>
                  Send code
                </Button>
                {otpSent && (
                  <>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter code"
                      className="max-w-[180px]"
                    />
                    <Button onClick={verifyOtp} disabled={!otp.trim() || status === "loading" || status === "redirecting"}>
                      {status === "redirecting" ? "Redirecting..." : "Verify & create account"}
                    </Button>
                  </>
                )}
              </div>
              <p className="text-sm text-ink-500">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
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

