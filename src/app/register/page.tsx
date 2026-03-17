"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { z } from "zod";
import { Suspense } from "react";

const emailSchema = z.string().email();

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Pre-fill from URL (e.g. after Get Price lead submit).
  useEffect(() => {
    const n = searchParams.get("name")?.trim();
    const e = searchParams.get("email")?.trim();
    const p = searchParams.get("phone")?.trim();
    if (n) setName(n);
    if (e) setEmail(e);
    if (p) setPhone(p);
  }, [searchParams]);

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
    if (!canRequestOtp) {
      setMessage("Fill all required fields and ensure passwords match.");
      return;
    }

    setStatus("loading");
    try {
      const otpRes = await api.requestOtp({
        email,
        name,
        password,
        phone: phone.trim() || undefined,
        channel
      });
      setOtpSent(true);
      if (otpRes.dev_code) {
        setMessage(`OTP generated. Use this code: ${otpRes.dev_code}`);
      } else {
        setMessage("OTP sent. Enter the code to finish registration.");
      }
    } catch (error: any) {
      setMessage(error?.message ?? "Could not send OTP.");
    } finally {
      setStatus("idle");
    }
  };

  const verifyOtp = async () => {
    setMessage(null);
    if (!otp.trim()) {
      setMessage("Enter OTP code.");
      return;
    }

    setStatus("loading");
    try {
      await api.verifyOtp(email, otp, channel);
      setMessage("Registration complete. Redirecting to sign in...");
      const returnUrl = searchParams.get("returnUrl")?.trim();
      const loginPath = returnUrl && returnUrl.startsWith("/") ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
      setTimeout(() => router.replace(loginPath), 700);
    } catch (error: any) {
      setMessage(error?.message ?? "OTP verification failed.");
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
                <Label>Phone (required for SMS OTP)</Label>
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
              <div className="space-y-2">
                <Label>OTP channel</Label>
                <Select value={channel} onValueChange={(value) => setChannel(value as "email" | "sms")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose OTP channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email OTP</SelectItem>
                    <SelectItem value="sms">Phone OTP (SMS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={requestOtp} disabled={!canRequestOtp || status === "loading"}>
                  Request OTP
                </Button>
                <Input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" className="max-w-[220px]" disabled={!otpSent} />
                <Button onClick={verifyOtp} disabled={!otpSent || !otp.trim() || status === "loading"}>
                  Verify OTP
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
    <Suspense fallback={
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
    }>
      <RegisterForm />
    </Suspense>
  );
}
