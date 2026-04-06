"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/components/auth-provider";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstileToken } from "@/lib/verify-turnstile-client";
import { BadgeCheck } from "lucide-react";

type Props = { params: { slug: string } };

export default function WhiteLabelCreditUnionPage({ params }: Props) {
  const slugValue = params.slug ?? "";
  const { user } = useAuth();

  const cuQuery = useQuery({
    queryKey: ["credit-union", slugValue],
    queryFn: () => api.getCreditUnionBySlug(slugValue),
    enabled: !!slugValue,
  });

  const cu = cuQuery.data;
  const isLoading = cuQuery.isLoading;
  const notFound = !isLoading && !cu;

  const approvalsQuery = useQuery({
    queryKey: ["approvals-mine", slugValue],
    queryFn: () => api.listMyApprovals(),
    enabled: !!user,
  });

  const primaryApproval = useMemo(() => {
    const items = approvalsQuery.data ?? [];
    if (!cu || items.length === 0) return null;
    const byName = items.find(
      (a) => (a.credit_union_name ?? "").trim().toLowerCase() === (cu.name ?? "").trim().toLowerCase()
    );
    return byName ?? items[0];
  }, [approvalsQuery.data, cu]);

  const approvalBudget = useMemo(() => {
    if (!primaryApproval?.loan_amount) return null;
    const loan = primaryApproval.loan_amount;
    const maxPriceUsed = Math.round(0.9 * loan);
    return { loan, maxPriceUsed };
  }, [primaryApproval]);

  const [leadName, setLeadName] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);

  const handleSubmitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cu) return;
    if (!leadName.trim() || !leadPhone.trim()) {
      setLeadStatus("error");
      setLeadMessage("Please enter at least your name and phone.");
      return;
    }
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        setLeadStatus("error");
        setLeadMessage("Complete the security check below.");
        return;
      }
      const check = await verifyTurnstileToken(turnstileToken);
      if (!check.ok) {
        setTurnstileToken(null);
        setTurnstileRemount((k) => k + 1);
        setLeadStatus("error");
        setLeadMessage("Security check failed. Please try again.");
        return;
      }
    }
    try {
      setLeadStatus("submitting");
      setLeadMessage(null);
      await api.submitLead({
        name: leadName.trim(),
        email: "no-email-provided@credit-union.local",
        phone: leadPhone.trim(),
        notes: [leadAddress.trim(), leadNotes.trim()].filter(Boolean).join(" · ") || undefined,
        source: `cu:${cu.slug}`,
      });
      setLeadStatus("success");
      setLeadMessage("Request sent. A credit union team member will follow up.");
      setLeadName("");
      setLeadAddress("");
      setLeadPhone("");
      setLeadNotes("");
      setTurnstileToken(null);
      setTurnstileRemount((k) => k + 1);
    } catch (error: any) {
      setLeadStatus("error");
      setLeadMessage(error?.message ?? "Could not send your request. Please try again.");
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md border-ink-200 bg-white">
          <CardContent className="py-10 text-center text-ink-600">
            <p>This page is not available.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/">Go back</Link>
            </Button>
          </CardContent>
        </Card>
        <SiteFooter poweredBy="Powered by New Car Superstore" />
      </div>
    );
  }

  const siteName = cu?.name ?? "";
  const heroTitle = (cu?.hero_title ?? "").trim() || siteName || "Find your next car";
  const heroSubtitle =
    (cu?.hero_subtitle ?? "").trim() ||
    "Shop vehicles with financing from your credit union. Browse anonymously until you are ready.";

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink-900">
      {/* Header: CU branding + member login */}
      <header className="border-b border-ink-200 bg-white py-4 shrink-0">
        <div className="container-wide flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {cu?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cu.logo_url}
                alt={siteName}
                className="h-11 w-auto max-w-[220px] object-contain object-left"
              />
            ) : (
              <span className="font-display text-xl font-semibold text-ink-900">{siteName || "Credit Union"}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Member login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Banner: editable image or generic bar */}
      {cu?.banner_url ? (
        <div className="w-full shrink-0 overflow-hidden bg-ink-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cu.banner_url}
            alt=""
            className="h-32 w-full object-cover object-center sm:h-40 md:h-48"
          />
        </div>
      ) : (
        <div
          className="h-24 w-full shrink-0 bg-gradient-to-r from-ink-700 to-ink-800 sm:h-28 md:h-32"
          aria-hidden
        />
      )}

      <main className="container-wide flex-1 py-10">
        {isLoading && (
          <div className="py-20 text-center text-ink-500">Loading…</div>
        )}
        {cu && !isLoading && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-start">
            {/* Left: hero + search */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl md:text-5xl">
                  {heroTitle}
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-ink-600">
                  {heroSubtitle}
                </p>
              </div>

              <Card className="border-ink-200 bg-white/95 shadow-sm">
                <CardHeader className="border-b border-ink-100 pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-3 text-base">
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      Find your next car
                    </span>
                    <span className="text-xs font-normal text-ink-500">
                      Search new or used vehicles. Logged-out visitors can browse with price filters only; members use
                      approval-aware budgets.
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm font-medium text-ink-700">
                    <span className="rounded-full bg-ink-100 px-3 py-1">Search New</span>
                    <span className="rounded-full bg-ink-50 px-3 py-1">Search Used</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="max-price">Max price</Label>
                      <Input
                        id="max-price"
                        type="number"
                        placeholder={
                          approvalBudget
                            ? `Up to ${approvalBudget.maxPriceUsed.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              })}`
                            : "Up to $50,000"
                        }
                        className="bg-ink-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="body-style">Body style</Label>
                      <Input
                        id="body-style"
                        placeholder="Any"
                        className="bg-ink-50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link
                        href={`/search?vehicle_type=new&mode=price&cu=${encodeURIComponent(
                          cu.slug
                        )}&max_price=50000`}
                      >
                        Search new cars
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link
                        href={`/search?vehicle_type=used&mode=price&cu=${encodeURIComponent(
                          cu.slug
                        )}&max_price=${approvalBudget?.maxPriceUsed ?? 50000}`}
                      >
                        Search used cars
                      </Link>
                    </Button>
                  </div>
                  {cu.loan_programs && cu.loan_programs.length > 0 && (
                    <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                        Sample rates from your credit union
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-ink-700">
                        {cu.loan_programs.map((p, i) => (
                          <li key={i}>
                            <span className="font-medium">{p.interest_rate}% APR</span> · up to{" "}
                            {p.max_term_months} months ·{" "}
                            {p.vehicle_type === "used" ? "Used" : "New"} vehicles
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {primaryApproval && approvalBudget && (
                <Card className="border-emerald-200 bg-emerald-50/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BadgeCheck className="h-4 w-4 text-emerald-700" />
                      You&apos;re pre-approved with your credit union
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-emerald-900">
                    <p>
                      Approval code{" "}
                      <span className="font-mono font-semibold">{primaryApproval.approval_code}</span> up to{" "}
                      <span className="font-semibold">
                        {primaryApproval.loan_amount.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      .
                    </p>
                    <p>
                      For used cars, we start your search around{" "}
                      <span className="font-semibold">
                        {approvalBudget.maxPriceUsed.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>{" "}
                      (90% of your approval).
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/customer">Open member dashboard</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link
                          href={`/search?vehicle_type=used&mode=price&cu=${encodeURIComponent(
                            cu.slug
                          )}&max_price=${approvalBudget.maxPriceUsed}`}
                        >
                          Used cars in budget
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: lead form */}
            <Card className="border-ink-200 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Request membership access or approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-ink-600">
                  If you do not yet have login credentials, tell us a bit about you and a team member from{" "}
                  <span className="font-semibold">{siteName}</span> will follow up about membership or an auto loan approval.
                </p>
                {leadMessage && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      leadStatus === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {leadMessage}
                  </div>
                )}
                <form className="space-y-3" onSubmit={handleSubmitLead}>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-name">Full name</Label>
                    <Input
                      id="lead-name"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-address">Address</Label>
                    <Input
                      id="lead-address"
                      value={leadAddress}
                      onChange={(e) => setLeadAddress(e.target.value)}
                      placeholder="Street, city, state"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-phone">Phone</Label>
                    <Input
                      id="lead-phone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-notes">Anything else?</Label>
                    <Textarea
                      id="lead-notes"
                      value={leadNotes}
                      onChange={(e) => setLeadNotes(e.target.value)}
                      placeholder="Tell us if you are looking for a specific vehicle or approval amount."
                      rows={3}
                    />
                  </div>
                  <TurnstileWidget
                    action="cu_lead"
                    remountKey={turnstileRemount}
                    onToken={setTurnstileToken}
                    className="flex justify-center"
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      leadStatus === "submitting" || (isTurnstileEnabled() && !turnstileToken)
                    }
                  >
                    {leadStatus === "submitting" ? "Sending…" : "Send request"}
                  </Button>
                </form>
                <p className="text-xs text-ink-500">
                  This form creates a request inside the credit union dashboard. A staff member will contact you—no
                  automated decision is made here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <SiteFooter poweredBy="Powered by New Car Superstore" />
    </div>
  );
}
