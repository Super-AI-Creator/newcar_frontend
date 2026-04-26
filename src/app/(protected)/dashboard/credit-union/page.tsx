"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { api, type ApprovalRecord } from "@/lib/api";
import { BadgeCheck, ChevronLeft, ChevronRight, ExternalLink, MessageSquare, Pencil, RefreshCw, Star, Trash2, UserRound } from "lucide-react";

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CreditUnionDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loanAmount, setLoanAmount] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLoanAmount, setEditLoanAmount] = useState("");
  const [editTermMonths, setEditTermMonths] = useState("");
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editApprovalCode, setEditApprovalCode] = useState("");
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberPhone, setEditMemberPhone] = useState("");
  const [editMemberEmail, setEditMemberEmail] = useState("");
  const [editSpecialNotes, setEditSpecialNotes] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const cuId = user?.credit_union_id != null ? Number(user.credit_union_id) : null;
  const isCuStaff = user?.role === "credit_union" || user?.role === "super_admin";

  useEffect(() => {
    if (!user) return;
    if (!isCuStaff) {
      router.replace("/dashboard/customer");
      return;
    }
    if (user.role === "credit_union" && (cuId == null || cuId === 0)) {
      router.replace("/dashboard/customer");
    }
  }, [user, isCuStaff, cuId, router]);

  const cuQuery = useQuery({
    queryKey: ["credit-union", cuId],
    queryFn: () => api.getCreditUnion(cuId!),
    enabled: !!cuId,
  });

  const approvalsQuery = useQuery({
    queryKey: ["approvals-mine"],
    queryFn: () => api.listMyApprovals(),
    enabled: !!cuId,
  });
  const membersQuery = useQuery({
    queryKey: ["cu-members", cuId],
    queryFn: () => api.listMyCreditUnionMembers({ limit: 800 }),
    enabled: !!cuId,
  });
  const memberActivityQuery = useQuery({
    queryKey: ["cu-member-activity", cuId],
    queryFn: () => api.listMyCreditUnionMemberActivitySummary({ limit: 2000 }),
    enabled: !!cuId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { approvalId: number; status: string }) =>
      api.updateApprovalStatus(cuId!, payload.approvalId, payload.status),
    onSuccess: () => {
      approvalsQuery.refetch();
      toast({ variant: "success", title: "Status updated" });
    },
    onError: (e: unknown) => {
      toast({
        variant: "error",
        title: "Failed to update status",
        description: (e as { message?: string })?.message,
      });
    },
  });

  const createApprovalMutation = useMutation({
    mutationFn: (payload: { loan_amount: number; term_months: number; special_notes?: string; approval_code?: string; member_phone?: string; member_email?: string }) =>
      api.createApproval(cuId!, payload),
    onSuccess: () => {
      setLoanAmount("");
      setTermMonths("");
      setSpecialNotes("");
      setApprovalCode("");
      setMemberPhone("");
      setMemberEmail("");
      approvalsQuery.refetch();
      toast({
        variant: "success",
        title: "Pre-approval created",
        description: "Invite sent when member email or phone is on file.",
      });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Failed to create approval", description: (e as { message?: string })?.message });
    },
  });

  const editApprovalMutation = useMutation({
    mutationFn: (payload: {
      approvalId: number;
      loan_amount: number;
      term_months: number;
      interest_rate: number;
      approval_code: string;
      member_name?: string | null;
      member_phone?: string | null;
      member_email?: string | null;
      special_notes?: string | null;
    }) => api.updateApproval(cuId!, payload.approvalId, payload),
    onSuccess: () => {
      approvalsQuery.refetch();
      setEditingId(null);
      toast({ variant: "success", title: "Approval updated" });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Failed to update approval", description: (e as { message?: string })?.message });
    },
  });

  const deleteApprovalMutation = useMutation({
    mutationFn: (approvalId: number) => api.deleteApproval(cuId!, approvalId),
    onSuccess: () => {
      approvalsQuery.refetch();
      toast({ variant: "success", title: "Approval deleted" });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Failed to delete approval", description: (e as { message?: string })?.message });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (approvalId: number) => api.resendApprovalInvite(cuId!, approvalId),
    onSuccess: (data) => {
      toast({
        variant: "success",
        title: "Invite resent",
        description: data.email_sent || data.sms_sent ? "Reminder sent to member." : "No email/SMS sent.",
      });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Failed to resend invite", description: (e as { message?: string })?.message });
    },
  });

  const handleCreate = () => {
    const amount = Number(loanAmount);
    const term = Number(termMonths);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(term) || term <= 0) {
      toast({ variant: "error", title: "Enter valid loan amount and term" });
      return;
    }
    createApprovalMutation.mutate({
      loan_amount: amount,
      term_months: term,
      special_notes: specialNotes.trim() || undefined,
      approval_code: approvalCode.trim() || undefined,
      member_phone: memberPhone.trim() || undefined,
      member_email: memberEmail.trim() || undefined,
    });
  };

  const startEditApproval = (a: ApprovalRecord) => {
    setEditingId(a.id);
    setEditLoanAmount(String(a.loan_amount ?? ""));
    setEditTermMonths(String(a.term_months ?? ""));
    setEditInterestRate(String(a.interest_rate ?? 0));
    setEditApprovalCode(a.approval_code ?? "");
    setEditMemberName(a.member_name ?? "");
    setEditMemberPhone(a.member_phone ?? "");
    setEditMemberEmail(a.member_email ?? "");
    setEditSpecialNotes(a.special_notes ?? "");
  };

  const saveEditApproval = () => {
    if (!editingId) return;
    const loan = Number(editLoanAmount);
    const term = Number(editTermMonths);
    const rate = Number(editInterestRate);
    if (!Number.isFinite(loan) || loan <= 0) {
      toast({ variant: "error", title: "Loan amount must be greater than 0" });
      return;
    }
    if (!Number.isFinite(term) || term <= 0) {
      toast({ variant: "error", title: "Term must be at least 1 month" });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      toast({ variant: "error", title: "Rate must be 0 or greater" });
      return;
    }
    if (!editApprovalCode.trim()) {
      toast({ variant: "error", title: "Reference code is required" });
      return;
    }
    editApprovalMutation.mutate({
      approvalId: editingId,
      loan_amount: loan,
      term_months: term,
      interest_rate: rate,
      approval_code: editApprovalCode.trim(),
      member_name: editMemberName.trim() || null,
      member_phone: editMemberPhone.trim() || null,
      member_email: editMemberEmail.trim() || null,
      special_notes: editSpecialNotes.trim() || null,
    });
  };

  if (!user || (!isCuStaff) || (user.role === "credit_union" && !cuId)) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="py-12 flex justify-center">
          <Card className="max-w-md">
            <CardContent className="py-10 text-center text-ink-600">Loading or access denied.</CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const cu = cuQuery.data;
  const approvals = approvalsQuery.data ?? [];

  const stats = useMemo(() => {
    const all = approvals;
    const byStatus: Record<string, number> = {};
    let fundedVolume = 0;
    let recentCreated = 0;
    const now = Date.now();
    for (const a of all) {
      const key = (a.status ?? "pending").toLowerCase();
      byStatus[key] = (byStatus[key] ?? 0) + 1;
      if (key === "funded" && typeof a.loan_amount === "number") {
        fundedVolume += a.loan_amount;
      }
      if (a.created_at) {
        const createdAt = Date.parse(a.created_at);
        if (!Number.isNaN(createdAt) && now - createdAt <= 7 * 24 * 60 * 60 * 1000) {
          recentCreated += 1;
        }
      }
    }
    return {
      total: all.length,
      pending: byStatus.pending ?? 0,
      active: byStatus.active ?? 0,
      funded: byStatus.funded ?? 0,
      lost: byStatus.lost ?? 0,
      canceled: byStatus.canceled ?? 0,
      fundedVolume,
      recentCreated,
    };
  }, [approvals]);
  const memberActivityMap = useMemo(() => {
    const map = new Map<number, { approvals: number; favorites: number; messages: number; deals: number; docs: number }>();
    for (const row of memberActivityQuery.data ?? []) {
      map.set(row.user_id, {
        approvals: row.approvals ?? 0,
        favorites: row.favorites ?? 0,
        messages: row.messages ?? 0,
        deals: row.deals ?? 0,
        docs: row.docs ?? 0,
      });
    }
    return map;
  }, [memberActivityQuery.data]);

  const memberRecords = useMemo(() => {
    return (membersQuery.data ?? []).map((m) => ({
      ...m,
      activity: memberActivityMap.get(Number(m.id)) ?? { approvals: 0, favorites: 0, messages: 0, deals: 0, docs: 0 },
    }));
  }, [membersQuery.data, memberActivityMap]);

  useEffect(() => {
    if (!memberRecords.length) {
      setSelectedMemberId(null);
      return;
    }
    setSelectedMemberId((prev) => {
      if (prev && memberRecords.some((m) => Number(m.id) === prev)) return prev;
      return Number(memberRecords[0].id);
    });
  }, [memberRecords]);

  const selectedMemberIndex = useMemo(
    () => memberRecords.findIndex((m) => Number(m.id) === Number(selectedMemberId)),
    [memberRecords, selectedMemberId]
  );
  const selectedMember = selectedMemberIndex >= 0 ? memberRecords[selectedMemberIndex] : null;
  const selectedMemberIdValue = selectedMember ? Number(selectedMember.id) : null;
  const selectedMemberFavoritesQuery = useQuery({
    queryKey: ["cu-member-favorites", selectedMemberIdValue],
    queryFn: () => api.favorites({ member_user_id: selectedMemberIdValue! }),
    enabled: !!selectedMemberIdValue,
  });
  const selectedMemberMessagesQuery = useQuery({
    queryKey: ["cu-member-messages", selectedMemberIdValue],
    queryFn: () => api.messages({ member_user_id: selectedMemberIdValue! }),
    enabled: !!selectedMemberIdValue,
  });

  const loansNeedingAttention = useMemo(() => {
    const now = Date.now();
    return approvals
      .filter((a) => {
        const status = (a.status ?? "pending").toLowerCase();
        if (!["pending", "active"].includes(status)) return false;
        if (!a.created_at) return false;
        const createdAt = Date.parse(a.created_at);
        if (Number.isNaN(createdAt)) return false;
        const ageDays = (now - createdAt) / (24 * 60 * 60 * 1000);
        return ageDays >= 3;
      })
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      .slice(0, 5)
      .map((a) => {
        const createdAt = a.created_at ? new Date(a.created_at) : null;
        const ageDays = createdAt ? Math.round((now - createdAt.getTime()) / (24 * 60 * 60 * 1000)) : null;
        const status = (a.status ?? "pending").toLowerCase();
        let reason = "Older approval";
        if (status === "pending") reason = "PO or funding not completed";
        if (status === "active") reason = "Member has not finalized purchase";
        return { approval: a, ageDays, reason };
      });
  }, [approvals]);

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-8">
        <section className="relative w-full overflow-hidden rounded-3xl border border-ink-200 bg-white px-6 py-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="market-kicker">Credit Union</p>
              <h1 className="market-heading text-3xl sm:text-4xl">{cu?.name ?? "Dashboard"}</h1>
              <p className="mt-1 text-sm text-ink-600">Create and track member pre-approvals and loan status.</p>
            </div>
            {cu?.slug && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/cu/${cu.slug}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View member site
                </Link>
              </Button>
            )}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatPill label="Total approvals" value={stats.total} />
            <StatPill label="Pending" value={stats.pending} />
            <StatPill label="Active" value={stats.active} />
            <StatPill label="Funded" value={stats.funded} />
            <StatPill label="Lost" value={stats.lost} />
            <StatPill label="Canceled" value={stats.canceled} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Loan pipeline snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-700">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Loans created (7d)</p>
                  <p className="mt-1 text-lg font-semibold text-ink-900">
                    {stats.recentCreated.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Currently funded</p>
                  <p className="mt-1 text-lg font-semibold text-ink-900">
                    {stats.funded.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink-600">
                This snapshot is based on approvals created and their current status. Use it as a quick view into your
                CU pipeline.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Loans needing attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink-700">
              {loansNeedingAttention.length === 0 && (
                <p className="text-sm text-ink-500">
                  No aging pending or active loans at the moment.
                </p>
              )}
              {loansNeedingAttention.length > 0 && (
                <ul className="space-y-1.5">
                  {loansNeedingAttention.map(({ approval, ageDays, reason }) => (
                    <li
                      key={approval.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900">
                          {formatCurrency(approval.loan_amount)} · {approval.term_months} mo ·{" "}
                          <span className="font-mono text-xs">{approval.approval_code}</span>
                        </p>
                        <p className="text-[11px] text-ink-700">
                          {reason}
                          {ageDays != null ? ` · ~${ageDays} days old` : null}
                        </p>
                      </div>
                      <Link
                        href={`/approvals/${encodeURIComponent(approval.approval_code)}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        View letter
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-brand-600" />
              Member CRM view
            </CardTitle>
            <p className="text-sm text-ink-600">Select a member to review activity, saved cars, and recent messages.</p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {memberRecords.length === 0 ? (
                  <p className="text-sm text-ink-500">No active members found for this credit union.</p>
                ) : (
                  memberRecords.map((m) => {
                    const active = Number(m.id) === Number(selectedMemberId);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMemberId(Number(m.id))}
                        className={`w-full rounded-lg border px-3 py-2 text-left ${
                          active ? "border-brand-300 bg-brand-50" : "border-ink-200 bg-white hover:bg-ink-50"
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-ink-900">{m.name || m.email}</p>
                        <p className="truncate text-xs text-ink-600">{m.email}</p>
                        <p className="mt-1 text-[11px] text-ink-500">
                          {m.activity.approvals} approvals · {m.activity.favorites} saved · {m.activity.messages} messages
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              {!selectedMember ? (
                <p className="text-sm text-ink-500">Choose a member to view details.</p>
              ) : (
                <div className="space-y-4 rounded-xl border border-ink-200 bg-ink-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink-900">{selectedMember.name || "Member"}</p>
                      <p className="text-sm text-ink-700">{selectedMember.email}</p>
                      <p className="text-xs text-ink-500">{selectedMember.phone || "No phone on file"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const prev = selectedMemberIndex <= 0 ? memberRecords.length - 1 : selectedMemberIndex - 1;
                          setSelectedMemberId(Number(memberRecords[prev].id));
                        }}
                        disabled={memberRecords.length <= 1}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = selectedMemberIndex >= memberRecords.length - 1 ? 0 : selectedMemberIndex + 1;
                          setSelectedMemberId(Number(memberRecords[next].id));
                        }}
                        disabled={memberRecords.length <= 1}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/dashboard/customer?memberUserId=${encodeURIComponent(String(selectedMember.id))}`}>
                          Open member workspace
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-5">
                    <StatPill label="Approvals" value={selectedMember.activity.approvals} />
                    <StatPill label="Saved cars" value={selectedMember.activity.favorites} />
                    <StatPill label="Messages" value={selectedMember.activity.messages} />
                    <StatPill label="Deals" value={selectedMember.activity.deals} />
                    <StatPill label="Docs" value={selectedMember.activity.docs} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-ink-200 bg-white p-3">
                      <p className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-900">
                        <Star className="h-4 w-4 text-amber-600" />
                        Saved cars
                      </p>
                      {selectedMemberFavoritesQuery.isLoading ? (
                        <p className="text-xs text-ink-500">Loading saved cars...</p>
                      ) : (selectedMemberFavoritesQuery.data?.items?.length ?? 0) === 0 ? (
                        <p className="text-xs text-ink-500">No saved cars yet.</p>
                      ) : (
                        <ul className="space-y-1 text-xs text-ink-700">
                          {(selectedMemberFavoritesQuery.data?.items ?? []).slice(0, 5).map((v) => (
                            <li key={v.vin} className="truncate">
                              {v.year} {v.make} {v.model} {v.trim} · {v.vin}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-lg border border-ink-200 bg-white p-3">
                      <p className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-900">
                        <MessageSquare className="h-4 w-4 text-sky-700" />
                        Recent messages
                      </p>
                      {selectedMemberMessagesQuery.isLoading ? (
                        <p className="text-xs text-ink-500">Loading messages...</p>
                      ) : (selectedMemberMessagesQuery.data?.items?.length ?? 0) === 0 ? (
                        <p className="text-xs text-ink-500">No messages yet.</p>
                      ) : (
                        <ul className="space-y-1 text-xs text-ink-700">
                          {(selectedMemberMessagesQuery.data?.items ?? []).slice(0, 5).map((msg) => (
                            <li key={msg.id} className="truncate">
                              {msg.body}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-brand-600" />
                Create pre-approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan amount ($)</Label>
                  <Input type="number" min={1} value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="25000" />
                </div>
                <div className="space-y-2">
                  <Label>Term (months)</Label>
                  <Input type="number" min={1} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} placeholder="60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="Restrictions, notes…" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Approval code (optional)</Label>
                <Input value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} placeholder="Auto-generated if blank" />
              </div>
              <div className="space-y-2">
                <Label>Member phone (optional, for SMS)</Label>
                <Input value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Member email (optional)</Label>
                <Input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@example.com" />
              </div>
              <Button onClick={handleCreate} disabled={createApprovalMutation.isPending} className="w-full">
                {createApprovalMutation.isPending ? "Creating…" : "Create pre-approval"}
              </Button>

            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Recent pre-approvals</CardTitle>
              <p className="text-sm text-ink-600">
                {approvals.length} total · Funded volume {formatCurrency(stats.fundedVolume)}
              </p>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 && <p className="text-sm text-ink-500">No pre-approvals yet.</p>}
              <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                {approvals.slice(0, 50).map((a: ApprovalRecord) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {formatCurrency(a.loan_amount)} · {a.term_months} mo
                        </p>
                        <p className="text-xs text-ink-600">
                          Code {a.approval_code}
                          {a.credit_union_name ? ` · ${a.credit_union_name}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={a.status} />
                        <select
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-xs"
                          value={a.status}
                          onChange={(event) =>
                            updateStatusMutation.mutate({
                              approvalId: a.id,
                              status: event.target.value,
                            })
                          }
                        >
                          {["pending", "active", "funded", "lost", "canceled"].map((status) => (
                            <option key={status} value={status}>
                              {status === "pending" ? "Awaiting Member Login" : status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        {a.status?.toLowerCase() === "pending" && !a.user_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => resendInviteMutation.mutate(a.id)}
                            disabled={resendInviteMutation.isPending}
                          >
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            Resend invite
                          </Button>
                        ) : null}
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => startEditApproval(a)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                          onClick={() => {
                            if (!window.confirm("Delete this approval? This cannot be undone.")) return;
                            deleteApprovalMutation.mutate(a.id);
                          }}
                          disabled={deleteApprovalMutation.isPending}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
                        <Link
                          href={`/approvals/${encodeURIComponent(a.approval_code)}`}
                          className="text-brand-600 hover:underline text-xs"
                        >
                          View letter
                        </Link>
                        {a.user_id ? (
                          <Link
                            href={`/dashboard/customer?memberUserId=${encodeURIComponent(String(a.user_id))}`}
                            className="text-sky-700 hover:underline text-xs"
                          >
                            Open member workspace
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {editingId === a.id ? (
                      <div className="mt-3 grid gap-2 rounded-lg border border-ink-200 bg-white p-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Input type="number" min={1} value={editLoanAmount} onChange={(e) => setEditLoanAmount(e.target.value)} placeholder="Loan amount" />
                          <Input type="number" min={1} value={editTermMonths} onChange={(e) => setEditTermMonths(e.target.value)} placeholder="Term months" />
                          <Input type="number" min={0} step="0.01" value={editInterestRate} onChange={(e) => setEditInterestRate(e.target.value)} placeholder="Rate APR" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={editApprovalCode} onChange={(e) => setEditApprovalCode(e.target.value)} placeholder="Reference code" />
                          <Input value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} placeholder="Member name (optional)" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={editMemberEmail} onChange={(e) => setEditMemberEmail(e.target.value)} placeholder="Member email (optional)" />
                          <Input value={editMemberPhone} onChange={(e) => setEditMemberPhone(e.target.value)} placeholder="Member phone (optional)" />
                        </div>
                        <Textarea value={editSpecialNotes} onChange={(e) => setEditSpecialNotes(e.target.value)} placeholder="Special notes (optional)" rows={2} />
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" onClick={saveEditApproval} disabled={editApprovalMutation.isPending}>
                            {editApprovalMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink-900">
        {Number.isFinite(value) ? value.toLocaleString() : "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status ?? "pending").toLowerCase();
  let color = "border-ink-200 bg-white text-ink-700";
  if (normalized === "pending") color = "border-amber-200 bg-amber-50 text-amber-800";
  else if (normalized === "active") color = "border-sky-200 bg-sky-50 text-sky-800";
  else if (normalized === "funded") color = "border-emerald-200 bg-emerald-50 text-emerald-800";
  else if (normalized === "lost" || normalized === "canceled")
    color = "border-rose-200 bg-rose-50 text-rose-800";
  else if (normalized === "claimed") color = "border-brand-200 bg-brand-50 text-brand-800";
  const label =
    normalized === "pending"
      ? "Awaiting Member Login"
      : normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return (
    <Badge className={`border text-[11px] font-medium capitalize ${color}`}>
      {label}
    </Badge>
  );
}
