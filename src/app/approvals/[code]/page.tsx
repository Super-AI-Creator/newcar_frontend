"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type Props = { params: { code: string } };

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
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

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-ink-200 bg-white">
          <CardContent className="py-10 text-center text-ink-600">
            <p>This approval code was not found or is no longer valid.</p>
            <Button asChild className="mt-4">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="min-h-screen bg-ink-50 py-8">
      <div className="container-wide max-w-2xl mx-auto">
        {isLoading && (
          <div className="py-20 text-center text-ink-500">Loading approval…</div>
        )}
        {approval && (
          <>
            <Card className="bg-white shadow-md border-ink-200 print:shadow-none">
              <CardHeader className="border-b border-ink-200">
                <CardTitle className="text-xl">Pre-Approval Letter</CardTitle>
                <p className="text-sm text-ink-600">
                  {approval.credit_union_name ?? "Credit Union"} — Approval code: <strong>{approval.approval_code}</strong>
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-500">Loan amount</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(approval.loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-ink-500">Term</p>
                    <p className="font-semibold text-ink-900">{approval.term_months} months</p>
                  </div>
                </div>
                {approval.special_notes && (
                  <div>
                    <p className="text-ink-500 text-sm">Notes</p>
                    <p className="text-ink-800">{approval.special_notes}</p>
                  </div>
                )}
                <p className="text-xs text-ink-500 pt-2">
                  Present this code when applying for financing. Valid for use with this credit union program.
                </p>
              </CardContent>
            </Card>

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
      </div>
    </div>
  );
}
