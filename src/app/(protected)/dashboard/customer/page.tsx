"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck, Clock3, CreditCard, FileText, Heart, MessageSquare, Upload, WalletCards } from "lucide-react";
import { api, type Vehicle } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toMillis(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatMileage(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString()} mi`;
}

function vehicleTitle(vehicle?: Vehicle, fallbackVin?: string) {
  if (!vehicle) return `VIN ${fallbackVin ?? "-"}`;
  const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean);
  if (parts.length === 0) return `VIN ${vehicle.vin ?? fallbackVin ?? "-"}`;
  return parts.join(" ");
}

function formatStatusLabel(value?: string | null) {
  return (value ?? "not_submitted").toString().replaceAll("_", " ");
}

function statusTone(kind: "timeline" | "docs" | "credit", value?: string | null) {
  const status = (value ?? "").toLowerCase();
  if (kind === "timeline") {
    if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
    if (status === "locked" || status === "docs_pending") return "border-sky-200 bg-sky-50 text-sky-700";
    return "border-brand-200 bg-brand-50 text-brand-700";
  }
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in_review" || status === "submitted" || status === "stored") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "rejected" || status === "declined") return "border-red-200 bg-red-50 text-red-700";
  return "border-ink-200 bg-white text-ink-600";
}

function HeaderStatusChip({
  kind,
  value
}: {
  kind: "timeline" | "docs" | "credit";
  value?: string | null;
}) {
  const icon = kind === "timeline" ? Clock3 : kind === "docs" ? FileText : CreditCard;
  const Icon = icon;
  const label = kind === "timeline" ? "Timeline" : kind === "docs" ? "Docs" : "Credit";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${statusTone(kind, value)}`}
      title={`${label}: ${formatStatusLabel(value)}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{formatStatusLabel(value)}</span>
    </span>
  );
}

function VehicleMiniCard({ vehicle, vin }: { vehicle?: Vehicle; vin?: string }) {
  if (!vin) return null;
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-20 overflow-hidden rounded-md border border-ink-200 bg-white">
          {vehicle?.photo ? (
            <img src={vehicle.photo} alt={vehicleTitle(vehicle, vin)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-500">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{vehicleTitle(vehicle, vin)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700">
            <span>Price: {formatCurrency(vehicle?.listed_price)}</span>
            <span>Mileage: {formatMileage(vehicle?.mileage)}</span>
            <span>Condition: {vehicle?.condition?.toUpperCase?.() ?? "-"}</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-ink-500">VIN {vin}</p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.role === "credit_union") {
      router.replace("/dashboard/credit-union");
    }
  }, [user?.role, router]);
  const [workspaceTab, setWorkspaceTab] = useState<"deal_room" | "favorites">("deal_room");
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [docsUploadVin, setDocsUploadVin] = useState<string | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: api.favorites
  });
  const messagesQuery = useQuery({
    queryKey: ["messages"],
    queryFn: api.messages
  });
  const dealsQuery = useQuery({
    queryKey: ["deals-mine"],
    queryFn: api.myDeals
  });
  const docsQuery = useQuery({
    queryKey: ["docs-mine"],
    queryFn: () => api.myDocSubmissions({ page_size: 100 }),
    refetchOnMount: "always"
  });
  const creditAppsQuery = useQuery({
    queryKey: ["credit-apps-mine"],
    queryFn: () => api.myCreditApplications({ page_size: 100 }),
    refetchOnMount: "always"
  });
  const approvalsQuery = useQuery({
    queryKey: ["approvals-mine"],
    queryFn: () => api.listMyApprovals(),
  });

  const claimCode = searchParams.get("claim");
  const claimedCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!claimCode?.trim() || claimedCodeRef.current === claimCode) return;
    claimedCodeRef.current = claimCode;
    (async () => {
      try {
        await api.claimApproval(claimCode.trim());
        toast({ variant: "success", title: "Pre-approval claimed" });
        approvalsQuery.refetch();
      } catch {
        toast({ variant: "error", title: "Could not claim approval" });
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("claim");
      router.replace(params.toString() ? `${pathname}?${params}` : pathname ?? "/dashboard/customer");
    })();
  }, [claimCode, pathname, router, searchParams, toast]);

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { vin?: string; message: string }) => api.sendMessage(payload),
    onSuccess: () => {
      setMessageDraft("");
      messagesQuery.refetch();
      toast({ variant: "success", title: "Message sent" });
    },
    onError: () => {
      toast({ variant: "error", title: "Message failed", description: "Could not send your message." });
    }
  });

  const threads = useMemo(() => {
    const items = messagesQuery.data?.items ?? [];
    const grouped = new Map<
      string,
      {
        key: string;
        vin?: string;
        brokerEmail?: string | null;
        items: typeof items;
      }
    >();

    for (const item of items) {
      const key = item.vin ?? "general";
      const existing = grouped.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        grouped.set(key, {
          key,
          vin: item.vin,
          brokerEmail: item.brokerAdminEmail ?? null,
          items: [item]
        });
      }
    }

    const list = Array.from(grouped.values()).map((thread) => ({
      ...thread,
      items: [...thread.items].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
      lastAt: thread.items.reduce((acc, item) => ((item.createdAt ?? "") > acc ? (item.createdAt ?? "") : acc), "")
    }));
    list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return list;
  }, [messagesQuery.data?.items]);

  const dealRoomRows = useMemo(() => {
    type Row = (typeof threads)[number] & { dealId?: number };
    const deals = dealsQuery.data?.items ?? [];
    const rows: Row[] = [];
    const seen = new Set<string>();

    for (const deal of deals) {
      if (!deal.vin) continue;
      seen.add(deal.vin);
      const msgThread = threads.find((t) => t.key === deal.vin);
      const lastFromMsgs = msgThread?.lastAt ?? "";
      const lastFromDeal = deal.updated_at ?? deal.created_at ?? "";
      const lastAt = lastFromMsgs || lastFromDeal;
      rows.push({
        key: deal.vin,
        vin: deal.vin,
        brokerEmail: deal.assigned_broker_email ?? msgThread?.brokerEmail ?? null,
        items: msgThread?.items ?? [],
        lastAt,
        dealId: deal.id
      });
    }

    for (const t of threads) {
      if (t.key === "general") {
        rows.push({ ...t, dealId: undefined });
        continue;
      }
      if (t.vin && !seen.has(t.vin)) {
        rows.push({ ...t, dealId: undefined });
      }
    }

    rows.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
    return rows;
  }, [threads, dealsQuery.data?.items]);

  const vehicleVins = useMemo(() => {
    const set = new Set<string>();
    for (const thread of threads) {
      if (thread.vin) set.add(thread.vin);
    }
    for (const deal of dealsQuery.data?.items ?? []) {
      if (deal.vin) set.add(deal.vin);
    }
    return Array.from(set).sort();
  }, [threads, dealsQuery.data?.items]);

  const vehiclesByVinQuery = useQuery({
    queryKey: ["customer-dashboard-vehicles", vehicleVins.join("|")],
    enabled: vehicleVins.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        vehicleVins.map(async (vin) => {
          try {
            const vehicle = await api.getVehicle(vin);
            return [vin, vehicle] as const;
          } catch {
            return [vin, { vin }] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, Vehicle>;
    }
  });
  const vehiclesByVin = vehiclesByVinQuery.data ?? {};
  const latestDocByVin = useMemo(() => {
    const map: Record<string, { status?: string | null; created_at?: string | null; broker_note?: string | null }> = {};
    for (const row of docsQuery.data?.items ?? []) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = toMillis(current?.created_at);
      const nextMs = toMillis(row.created_at);
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { status: row.status, created_at: row.created_at, broker_note: row.broker_note };
      }
    }
    return map;
  }, [docsQuery.data?.items]);
  const latestCreditByVin = useMemo(() => {
    const map: Record<string, { status?: string | null; created_at?: string | null; broker_note?: string | null }> = {};
    for (const row of creditAppsQuery.data?.items ?? []) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = toMillis(current?.created_at);
      const nextMs = toMillis(row.created_at);
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { status: row.status, created_at: row.created_at, broker_note: row.broker_note };
      }
    }
    return map;
  }, [creditAppsQuery.data?.items]);

  const activeThread = useMemo(() => {
    if (dealRoomRows.length === 0) return null;
    if (!selectedThreadKey) return dealRoomRows[0];
    return dealRoomRows.find((thread) => thread.key === selectedThreadKey) ?? dealRoomRows[0];
  }, [dealRoomRows, selectedThreadKey]);

  const activeDeal = useMemo(() => {
    if (!activeThread?.vin) return undefined;
    return (dealsQuery.data?.items ?? []).find((d) => d.vin === activeThread.vin);
  }, [activeThread?.vin, dealsQuery.data?.items]);

  useEffect(() => {
    if (workspaceTab !== "deal_room" || !activeThread) return;
    const node = messageScrollRef.current;
    if (!node) return;
    const raf = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [workspaceTab, activeThread?.key, activeThread?.items.length]);

  const resetDocsUploadForm = () => {
    setDriversLicenseFile(null);
    setInsuranceFile(null);
  };

  const closeDocsDialog = () => {
    setDocsDialogOpen(false);
    setDocsUploadVin(null);
    resetDocsUploadForm();
  };

  const openDocsDialog = (vin: string) => {
    setDocsUploadVin(vin);
    resetDocsUploadForm();
    setDocsDialogOpen(true);
  };

  const uploadDocsMutation = useMutation({
    mutationFn: async (payload: { vin: string; driversLicense: File; insurance: File }) => {
      const formData = new FormData();
      formData.set("vin", payload.vin);
      formData.set("drivers_license", payload.driversLicense);
      formData.set("insurance", payload.insurance);
      return api.forwardDocs(formData);
    },
    onSuccess: () => {
      docsQuery.refetch();
      closeDocsDialog();
      toast({ variant: "success", title: "Documents uploaded" });
    },
    onError: (error: any) => {
      toast({
        variant: "error",
        title: "Upload failed",
        description: error?.message ?? "Could not upload documents."
      });
    }
  });

  const submitDocsUpload = () => {
    if (!docsUploadVin || !driversLicenseFile || !insuranceFile) {
      toast({
        variant: "error",
        title: "Missing documents",
        description: "Please upload both driver license and insurance files."
      });
      return;
    }
    uploadDocsMutation.mutate({
      vin: docsUploadVin,
      driversLicense: driversLicenseFile,
      insurance: insuranceFile
    });
  };

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-8">
        <section className="tc-fade-up relative w-full overflow-hidden rounded-3xl border border-ink-200 bg-white px-6 py-7 shadow-sm">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-35" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="market-kicker">Member Workspace</p>
              <h1 className="market-heading text-3xl sm:text-4xl">Customer Dashboard</h1>
              <p className="mt-1 text-sm text-ink-600">Track favorites and use your Deal Room to message your broker.</p>
            </div>
            <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
              {favoritesQuery.data?.items.length ?? 0} favorites
            </Badge>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Saved Cars", value: favoritesQuery.data?.items.length ?? 0, icon: Heart },
            { label: "Messages", value: messagesQuery.data?.items.length ?? 0, icon: MessageSquare },
            { label: "Active Deals", value: dealsQuery.data?.items.length ?? 0, icon: WalletCards }
          ].map((item) => (
            <Card key={item.label} className="bg-white shadow-sm">
              <CardContent className="space-y-1 py-6">
                <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-ink-500">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </p>
                <p className="text-3xl font-semibold text-ink-900">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {(approvalsQuery.data?.length ?? 0) > 0 && (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                Pre-Approved
              </CardTitle>
              <p className="text-sm text-ink-600">Your credit union pre-approvals. Use your coupon when shopping.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvalsQuery.data?.map((a) => (
                <Link
                  key={a.id}
                  href={`/approvals/${encodeURIComponent(a.approval_code)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm transition hover:border-brand-300 hover:bg-white"
                >
                  <span className="font-medium text-ink-900">
                    {formatCurrency(a.loan_amount)} · {a.term_months} mo
                    {a.credit_union_name ? ` · ${a.credit_union_name}` : ""}
                  </span>
                  <span className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-xs text-ink-600">
                    {a.approval_code}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <Card className="tc-fade-up bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                onClick={() => setWorkspaceTab("deal_room")}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  workspaceTab === "deal_room" ? "border-brand-500 bg-brand-50 text-brand-900" : "border-ink-200 bg-white text-ink-700"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Deal Room
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("favorites")}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  workspaceTab === "favorites" ? "border-brand-500 bg-brand-50 text-brand-900" : "border-ink-200 bg-white text-ink-700"
                }`}
              >
                <Heart className="h-4 w-4" />
                Favorites
              </button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {workspaceTab === "favorites" && (
              <Card className="tc-fade-up bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-brand-700" />
                    Favorites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(favoritesQuery.data?.items ?? []).length === 0 && (
                    <p className="text-sm text-ink-600">No favorites yet.</p>
                  )}
                  {(favoritesQuery.data?.items ?? []).map((vehicle) => (
                    <Link
                      key={vehicle.vin}
                      href={`/vehicles/${encodeURIComponent(vehicle.vin)}`}
                      className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-3 py-3 text-sm transition hover:border-brand-300 hover:bg-white"
                    >
                      <span className="font-medium text-ink-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      <span className="text-xs text-ink-500">View details</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {workspaceTab === "deal_room" && (
              <Card className="tc-fade-up-delay bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-brand-700" />
                    Deal Room
                  </CardTitle>
                  <p className="text-sm font-normal text-ink-600">
                    Client ↔ broker communication. Choose a deal or conversation, use the shortcuts, then chat below.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-ink-600">
                  {dealRoomRows.length === 0 && (
                    <p className="text-sm text-ink-600">
                      No active deals or messages yet. Open a vehicle and start a conversation to see it here.
                    </p>
                  )}
                  {dealRoomRows.length > 0 && (
                    <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
                      <div className="space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-2">
                        {dealRoomRows.map((thread) => (
                          <button
                            key={thread.key}
                            type="button"
                            onClick={() => setSelectedThreadKey(thread.key)}
                            className={`w-full rounded-md border px-3 py-2 text-left ${
                              activeThread?.key === thread.key ? "border-brand-600 bg-brand-50" : "border-ink-200 bg-white"
                            }`}
                          >
                            <p className="text-xs font-semibold text-ink-900">{thread.vin ? `VIN ${thread.vin}` : "General"}</p>
                            <p className="truncate text-xs text-ink-600">{thread.brokerEmail ?? "Broker assignment pending"}</p>
                            <div className="mt-0.5 flex items-center justify-between">
                              <p className="text-[11px] text-ink-500">{formatDateTime(thread.lastAt)}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-lg border border-ink-200 bg-white p-3">
                        {activeThread && (
                          <>
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-ink-200 pb-2">
                              <div>
                                <p className="text-xs text-ink-600">
                                  {activeThread.vin ? `VIN ${activeThread.vin}` : "General conversation"}
                                </p>
                                <p className="text-xs text-ink-500">Broker: {activeThread.brokerEmail ?? "Assignment pending"}</p>
                              </div>
                              {activeThread.vin && (
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  <HeaderStatusChip kind="timeline" value={activeDeal?.status ?? "inquiry"} />
                                  <HeaderStatusChip kind="docs" value={latestDocByVin[activeThread.vin]?.status ?? "not_submitted"} />
                                  <HeaderStatusChip kind="credit" value={latestCreditByVin[activeThread.vin]?.status ?? "not_submitted"} />
                                </div>
                              )}
                            </div>
                            <div className="mb-3">
                              <VehicleMiniCard vehicle={activeThread.vin ? vehiclesByVin[activeThread.vin] : undefined} vin={activeThread.vin} />
                            </div>

                            {activeThread.vin && (
                              <div className="mb-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    chatInputRef.current?.focus();
                                    chatInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                  }}
                                >
                                  Ask a question
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => openDocsDialog(activeThread.vin!)}>
                                  <Upload className="mr-1 h-3.5 w-3.5" />
                                  Upload documents
                                </Button>
                                <Button asChild size="sm">
                                  <Link href={`/vehicles/${encodeURIComponent(activeThread.vin!)}`}>Open Vehicle details</Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/credit-application?vin=${encodeURIComponent(activeThread.vin!)}`}>
                                    <CreditCard className="mr-1 h-3.5 w-3.5" />
                                    Credit Application
                                  </Link>
                                </Button>
                              </div>
                            )}

                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Customer ↔ Broker</p>
                            <div
                              ref={messageScrollRef}
                              className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-ink-200 bg-ink-50 p-2"
                            >
                              {activeThread.items.length === 0 && (
                                <p className="text-center text-xs text-ink-500">No messages yet — say hello to your broker below.</p>
                              )}
                              {activeThread.items.map((message) => (
                                <div
                                  key={message.id}
                                  className={`max-w-[90%] rounded-md border px-3 py-2 ${
                                    message.senderType === "broker"
                                      ? "mr-auto border-ink-200 bg-white"
                                      : "ml-auto border-brand-200 bg-brand-50"
                                  }`}
                                >
                                  <p className="text-[11px] font-semibold uppercase text-ink-500">
                                    {message.senderType === "broker" ? "Broker" : "Customer"}
                                  </p>
                                  <p className="text-sm text-ink-900">{message.body}</p>
                                  <p className="text-[11px] text-ink-500">{formatDateTime(message.createdAt)}</p>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 space-y-2">
                              {!activeThread.vin && (
                                <p className="text-xs text-ink-500">Choose a vehicle thread to send messages with a VIN attached.</p>
                              )}
                              <Textarea
                                ref={chatInputRef}
                                value={messageDraft}
                                onChange={(event) => setMessageDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  const canSend = !sendMessageMutation.isPending && !!messageDraft.trim() && !!activeThread?.vin;
                                  if (!canSend) return;
                                  if ((event.key === "Enter" && !event.shiftKey) || (event.key === "Enter" && event.ctrlKey)) {
                                    event.preventDefault();
                                    sendMessageMutation.mutate({
                                      vin: activeThread.vin!,
                                      message: messageDraft.trim()
                                    });
                                  }
                                }}
                                placeholder="Type a message to your broker…"
                                className="min-h-[90px]"
                              />
                              <div className="flex justify-end">
                                <Button
                                  disabled={sendMessageMutation.isPending || !messageDraft.trim() || !activeThread?.vin}
                                  onClick={() => {
                                    if (!activeThread?.vin || !messageDraft.trim()) return;
                                    sendMessageMutation.mutate({
                                      vin: activeThread.vin,
                                      message: messageDraft.trim()
                                    });
                                  }}
                                >
                                  Send
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog
          open={docsDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDocsDialog();
              return;
            }
            setDocsDialogOpen(true);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload required docs</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-700">
                VIN: <span className="font-semibold">{docsUploadVin ?? "-"}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="drivers-license-file">Driver license</Label>
                <Input
                  id="drivers-license-file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => setDriversLicenseFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance-file">Insurance card</Label>
                <Input
                  id="insurance-file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => setInsuranceFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-xs text-ink-500">Accepted files: PDF, JPG, PNG, WEBP. Max 8MB each.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDocsDialog} disabled={uploadDocsMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={submitDocsUpload}
                  disabled={!docsUploadVin || !driversLicenseFile || !insuranceFile || uploadDocsMutation.isPending}
                >
                  {uploadDocsMutation.isPending ? "Uploading..." : "Upload docs"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
