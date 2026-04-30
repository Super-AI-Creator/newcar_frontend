"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

type Props = { params: { code: string } };

const LETTER_BLUE = "#1a4d8c";
const LETTER_MUTED = "#4a5568";

const DEFAULT_CONDITIONS = [
  "Vehicle must be 2014 or newer",
  "Must have under 100,000 miles",
  "Maximum 120% Loan-to-Value (LTV)",
];

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatLetterDate(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function dearLine(email?: string | null) {
  if (!email?.includes("@")) return "Dear Member,";
  const local = email.split("@")[0];
  const first = local.split(/[._-]/)[0];
  if (!first) return "Dear Member,";
  const cap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return `Dear ${cap},`;
}

function recipientLines(email?: string | null) {
  if (!email?.trim()) return ["Member"];
  const local = email.split("@")[0];
  const display = local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
  return [display || "Member", email.trim()];
}

function conditionsFromNotes(notes?: string | null): string[] {
  if (!notes?.trim()) return DEFAULT_CONDITIONS;
  const lines = notes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : DEFAULT_CONDITIONS;
}

export default function ApprovalCouponPage({ params }: Props) {
  const code = params?.code ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const approvalQuery = useQuery({
    queryKey: ["approval-by-code", code],
    queryFn: () => api.getApprovalByCode(code),
    enabled: !!code,
  });

  const approval = approvalQuery.data;
  const isLoading = approvalQuery.isLoading;
  const notFound = !isLoading && !approval;

  const conditions = useMemo(() => conditionsFromNotes(approval?.special_notes), [approval?.special_notes]);
  const cuName = approval?.credit_union_name ?? "Credit Union";
  const recipient = useMemo(() => recipientLines(approval?.member_email), [approval?.member_email]);

  const loginReturn = `/dashboard/customer?claim=${encodeURIComponent(code)}`;

  const handleClaim = async () => {
    if (!code || claiming) return;
    setClaiming(true);
    try {
      await api.claimApproval(code);
      router.push("/dashboard/customer");
    } catch {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[680px] px-4 print:max-w-none print:px-8">
        {notFound ? (
          <Card className="mx-auto max-w-md border-slate-200 bg-white">
            <CardContent className="py-10 text-center text-slate-600">
              <p>This approval code was not found or is no longer valid.</p>
              <Button asChild className="mt-4">
                <Link href="/">Go to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {isLoading && <div className="py-20 text-center text-slate-500">Loading approval…</div>}
            {approval && (
          <>
            <article
              className="bg-white px-8 py-10 shadow-sm border border-slate-200 print:shadow-none print:border-0"
              style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1a202c" }}
            >
              {/* Header */}
              <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between pb-4 border-b-2" style={{ borderColor: LETTER_BLUE }}>
                <div className="flex items-start gap-3 min-w-0">
                  {approval.credit_union_logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={approval.credit_union_logo_url}
                      alt=""
                      className="h-14 w-auto max-w-[200px] object-contain object-left"
                    />
                  ) : (
                    <div className="leading-tight">
                      <div className="text-2xl font-bold tracking-tight" style={{ color: LETTER_BLUE }}>
                        {cuName}
                      </div>
                    </div>
                  )}
                </div>
                <address className="not-italic text-sm text-right sm:max-w-[240px]" style={{ color: LETTER_MUTED }}>
                  {approval.credit_union_address ? (
                    approval.credit_union_address.split(/\n/).map((line, i) => <div key={i}>{line}</div>)
                  ) : (
                    <div className="text-slate-400">Address on file</div>
                  )}
                  {approval.credit_union_phone && (
                    <div className="mt-1">
                      Phone: {approval.credit_union_phone}
                    </div>
                  )}
                  {approval.credit_union_portal_url && (
                    <div className="mt-1">
                      <a href={approval.credit_union_portal_url} className="underline" style={{ color: LETTER_BLUE }}>
                        Member portal
                      </a>
                    </div>
                  )}
                </address>
              </header>

              {/* Title band */}
              <div className="my-8 space-y-3">
                <div className="h-px w-full" style={{ backgroundColor: LETTER_BLUE, opacity: 0.35 }} />
                <h1
                  className="text-center text-base font-bold tracking-wide sm:text-lg"
                  style={{ color: LETTER_BLUE, letterSpacing: "0.06em" }}
                >
                  AUTO LOAN PRE-APPROVAL LETTER
                </h1>
                <div className="h-px w-full" style={{ backgroundColor: LETTER_BLUE, opacity: 0.35 }} />
              </div>

              {/* Date & recipient */}
              <div className="text-sm space-y-1 mb-8" style={{ color: LETTER_MUTED }}>
                <p>{formatLetterDate(approval.created_at)}</p>
                <div className="h-4" />
                {recipient.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <div className="h-4" />
                <p className="text-[#1a202c]">{dearLine(approval.member_email)}</p>
              </div>

              {/* Body */}
              <div className="text-sm leading-relaxed space-y-6" style={{ color: LETTER_MUTED }}>
                <p>
                  We are pleased to inform you that you have been pre-approved for an auto loan with{" "}
                  <span className="font-medium text-[#1a202c]">{cuName}</span>. You are approved for an amount up to:
                </p>

                <div className="relative py-6 my-2">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-40"
                    style={{ background: `linear-gradient(90deg, transparent, ${LETTER_BLUE}, transparent)` }}
                  />
                  <p
                    className="text-center text-2xl sm:text-3xl font-bold"
                    style={{ color: LETTER_BLUE }}
                  >
                    Up to {formatCurrency(approval.loan_amount)}
                  </p>
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-40"
                    style={{ background: `linear-gradient(90deg, transparent, ${LETTER_BLUE}, transparent)` }}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold mb-3" style={{ color: LETTER_BLUE }}>
                    Pre-Approval Conditions:
                  </h2>
                  <ul className="list-disc pl-5 space-y-1 [&>li::marker]:text-[#1a4d8c]">
                    {conditions.map((c, i) => (
                      <li key={i} style={{ color: LETTER_MUTED }}>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <p>Loan term: {approval.term_months} months. Approval code: {approval.approval_code}.</p>

                <p>Please provide the purchase agreement and proof of insurance when finalizing the loan.</p>
                <p>For any questions or to discuss the next steps, please contact us directly.</p>
              </div>

              {/* Signature */}
              <footer className="mt-12 text-sm space-y-1" style={{ color: LETTER_MUTED }}>
                <p>Sincerely,</p>
                <div className="h-10 print:h-12" />
                <p className="font-bold text-base" style={{ color: LETTER_BLUE }}>
                  {approval.contact_name ?? "Loan Officer"}
                </p>
                <p>Loan Officer</p>
                {approval.contact_phone && <p>Phone: {approval.contact_phone}</p>}
                {approval.contact_email && (
                  <p>
                    Email:{" "}
                    <a href={`mailto:${approval.contact_email}`} style={{ color: LETTER_BLUE }}>
                      {approval.contact_email}
                    </a>
                  </p>
                )}
              </footer>
            </article>

            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
              {user ? (
                <Button onClick={handleClaim} disabled={claiming}>
                  {claiming ? "Claiming…" : "Claim this approval"}
                </Button>
              ) : (
                <>
                  <Button asChild>
                    <Link href={`/login?returnUrl=${encodeURIComponent(loginReturn)}`}>Log in to claim</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/creditunions/join?approval=${encodeURIComponent(code)}`}>
                      Create account to claim (use your CU signup link for token)
                    </Link>
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                Print letter
              </Button>
            </div>
          </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
