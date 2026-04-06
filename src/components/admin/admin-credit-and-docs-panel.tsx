"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileSpreadsheet,
  FolderOpen,
  Mail,
  UserRoundCheck,
  XCircle
} from "lucide-react";

import type { CreditApplicationRecord, DocumentSubmissionRecord } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/toast-provider";

export type AdminCreditAndDocsLayout = "compact" | "full";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function creditPayloadRawForDisplay(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const rest = { ...payload };
  delete rest.formatted_html;
  delete rest.formatted_plain;
  return rest;
}

function formattedCreditAppPlainText(html: string, plain: string): string {
  if (plain.trim()) return plain;
  if (!html.trim() || typeof document === "undefined") return plain;
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").trim() || plain;
}

function creditActionIcon(status: string) {
  if (status === "approved") return CheckCircle2;
  if (status === "declined") return XCircle;
  return Clock3;
}

function creditStatusBadgeClass(status?: string | null) {
  const value = (status ?? "submitted").toLowerCase();
  if (value === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "declined" || value === "rejected") return "border-rose-200 bg-rose-50 text-rose-800";
  if (value === "in_review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function creditStatusCardGradientClass(status?: string | null) {
  const value = (status ?? "submitted").toLowerCase();
  if (value === "approved") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_58%)]";
  }
  if (value === "declined" || value === "rejected") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),transparent_58%)]";
  }
  if (value === "in_review") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_58%)]";
  }
  return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_58%)]";
}

function docStatusBadgeClass(status?: string | null) {
  const value = (status ?? "submitted").toLowerCase();
  if (value === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "rejected" || value === "declined") return "border-rose-200 bg-rose-50 text-rose-800";
  if (value === "in_review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function docStatusCardGradientClass(status?: string | null) {
  const value = (status ?? "submitted").toLowerCase();
  if (value === "approved") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_58%)]";
  }
  if (value === "rejected" || value === "declined") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),transparent_58%)]";
  }
  if (value === "in_review") {
    return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_58%)]";
  }
  return "bg-white bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_58%)]";
}

function CreditApplicationDetailPanel({
  payload,
  applicationId
}: {
  payload: Record<string, unknown> | null | undefined;
  applicationId: number;
}) {
  const { toast } = useToast();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const p = payload && typeof payload === "object" ? payload : {};
  const html = typeof p.formatted_html === "string" ? p.formatted_html : "";
  const plain = typeof p.formatted_plain === "string" ? p.formatted_plain : "";
  const copyableText = formattedCreditAppPlainText(html, plain);
  const canCopyFormatted = copyableText.length > 0;

  async function copyFormattedToClipboard() {
    if (!canCopyFormatted) {
      toast({ variant: "error", title: "Nothing to copy", description: "No formatted text for this application." });
      return;
    }
    const header = `Credit Application #${applicationId}\n\n`;
    try {
      await navigator.clipboard.writeText(header + copyableText);
      setCopyState("copied");
      toast({ variant: "success", title: "Copied", description: "Formatted application copied — paste into your email." });
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      toast({ variant: "error", title: "Copy failed", description: "Your browser blocked clipboard access." });
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <>
      {/* Stack copy + viewer vertically so narrow grid cards never squeeze the details panel to a few px wide */}
      <div className="mt-2 flex w-full min-w-0 flex-col items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full shrink-0 gap-1.5 text-xs sm:w-auto sm:self-start"
          disabled={!canCopyFormatted}
          onClick={() => {
            void copyFormattedToClipboard();
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          {copyState === "copied" ? "Copied" : "Copy formatted for email"}
        </Button>
        <details className="w-full min-w-0 rounded border border-ink-200 bg-white p-2">
          <summary className="cursor-pointer text-xs font-medium text-ink-700">View application</summary>
          <Tabs defaultValue="readable" className="mt-3 w-full min-w-0" key={`credit-app-tabs-${applicationId}`}>
            <TabsList className="h-8 w-full min-w-0 flex-wrap justify-start sm:inline-flex sm:w-auto">
              <TabsTrigger value="readable" className="px-3 text-xs">
                Readable
              </TabsTrigger>
              <TabsTrigger value="raw" className="px-3 text-xs">
                Raw JSON
              </TabsTrigger>
            </TabsList>
            <TabsContent value="readable" className="mt-2 w-full min-w-0">
              {!html && !plain && (
                <p className="text-xs text-ink-500">No formatted snapshot (older submission). Use Raw JSON for field data.</p>
              )}
              {html ? (
                <div
                  className="credit-app-formatted-html max-h-[min(480px,70vh)] w-full min-w-0 overflow-x-auto overflow-y-auto rounded border border-ink-100 bg-white p-3 text-sm [&_table]:w-full [&_table]:max-w-full [&_table]:table-fixed [&_table]:text-sm"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : plain ? (
                <pre className="max-h-[min(480px,70vh)] w-full min-w-0 overflow-auto whitespace-pre-wrap break-words rounded border border-ink-100 bg-ink-50 p-3 font-mono text-xs text-ink-800">
                  {plain}
                </pre>
              ) : null}
            </TabsContent>
            <TabsContent value="raw" className="mt-2 w-full min-w-0">
              <pre className="max-h-64 w-full min-w-0 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-700">
                {prettyJson(creditPayloadRawForDisplay(payload))}
              </pre>
            </TabsContent>
          </Tabs>
        </details>
      </div>
      <span className="mt-1 block text-[11px] text-ink-500">Plain text - paste into Gmail, Outlook, etc.</span>
    </>
  );
}

type ConfirmAction = (title: string, onConfirm: () => void, description?: string) => void;

export type AdminCreditAndDocsPanelProps = {
  layout: AdminCreditAndDocsLayout;
  /** Only used when layout is full (credit_docs tab scroll target). */
  docsQueueRef?: RefObject<HTMLDivElement>;
  confirmAction: ConfirmAction;

  creditApplications: CreditApplicationRecord[];
  pendingCreditCount: number;
  creditSearch: string;
  setCreditSearch: (v: string) => void;
  creditStatusFilter: string;
  setCreditStatusFilter: (v: string) => void;
  creditNotes: Record<number, string>;
  setCreditNotes: Dispatch<SetStateAction<Record<number, string>>>;
  isSuperAdmin: boolean;
  updateCreditApplicationPending: boolean;
  onUpdateCreditApplication: (payload: { id: number; status?: string; broker_note?: string }) => void;

  docSubmissions: DocumentSubmissionRecord[];
  pendingDocCount: number;
  docSearch: string;
  setDocSearch: (v: string) => void;
  docStatusFilter: string;
  setDocStatusFilter: (v: string) => void;
  docNotes: Record<number, string>;
  setDocNotes: Dispatch<SetStateAction<Record<number, string>>>;
  updateDocSubmissionPending: boolean;
  onUpdateDocSubmission: (payload: { id: number; status?: string; broker_note?: string }) => void;
  viewDoc: (submissionId: number, kind: "drivers_license" | "insurance") => void;
};

const CREDIT_STATUS_FILTERS = ["all", "submitted", "in_review", "approved", "declined"] as const;
const DOC_STATUS_FILTERS = ["all", "submitted", "in_review", "approved", "rejected"] as const;

export function AdminCreditAndDocsPanel({
  layout,
  docsQueueRef,
  confirmAction,
  creditApplications,
  pendingCreditCount,
  creditSearch,
  setCreditSearch,
  creditStatusFilter,
  setCreditStatusFilter,
  creditNotes,
  setCreditNotes,
  isSuperAdmin,
  updateCreditApplicationPending,
  onUpdateCreditApplication,
  docSubmissions,
  pendingDocCount,
  docSearch,
  setDocSearch,
  docStatusFilter,
  setDocStatusFilter,
  docNotes,
  setDocNotes,
  updateDocSubmissionPending,
  onUpdateDocSubmission,
  viewDoc
}: AdminCreditAndDocsPanelProps) {
  const isFull = layout === "full";

  const creditCard = (
    <Card className="border-ink-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-600" />
          Credit Applications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
          <Badge>{creditApplications.length} applications</Badge>
          <Badge className="bg-red-50 text-red-700">{pendingCreditCount} pending review</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={creditSearch}
            onChange={(e) => setCreditSearch(e.target.value)}
            placeholder="Search by VIN or id"
            className="max-w-sm"
          />
          <div className="flex gap-2">
            {CREDIT_STATUS_FILTERS.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={creditStatusFilter === status ? "default" : "outline"}
                onClick={() => setCreditStatusFilter(status)}
              >
                {status.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
        </div>
        <div
          className={
            isSuperAdmin
              ? "grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2"
              : "grid gap-3 md:grid-cols-2"
          }
        >
          {creditApplications.map((item) => (
            <div
              key={item.id}
              className={`min-w-0 rounded-2xl border border-ink-200/90 p-4 shadow-luxe-soft ${creditStatusCardGradientClass(item.status)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-900">
                  App #{item.id} | {item.customer_name ?? item.customer_email ?? "Customer"} | VIN {item.vin ?? "-"}
                </p>
                <Badge className={creditStatusBadgeClass(item.status)}>{item.status ?? "submitted"}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Submitted: {formatDateTime(item.created_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Source: {item.source ?? "-"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Contact: {item.customer_email ?? "-"}
                </span>
              </div>
              {isSuperAdmin &&
                (isFull ? (
                  <div className="mt-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-ink-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">Review Owner</p>
                      <Badge className="border border-brand-200 bg-white text-brand-700">
                        {item.reviewed_at ? "Reviewed" : "Pending review"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
                      <span className="inline-flex items-center gap-1">
                        <UserRoundCheck className="h-3.5 w-3.5 text-brand-700" />
                        Approved/Reviewed by: {item.reviewed_by_name ?? "Not assigned"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-brand-700" />
                        {item.reviewed_by_email ?? "No email"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 text-brand-700" />
                        Reviewed at: {formatDateTime(item.reviewed_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-ink-50 p-3">
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
                      <span className="inline-flex items-center gap-1">
                        <UserRoundCheck className="h-3.5 w-3.5 text-brand-700" />
                        Reviewed by: {item.reviewed_by_name ?? "—"} · {formatDateTime(item.reviewed_at)}
                      </span>
                    </div>
                  </div>
                ))}
              {!isSuperAdmin &&
                (isFull ? (
                  <>
                    <div className="mt-2 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/80 via-white to-white p-2.5">
                      <div className="flex flex-wrap gap-2">
                        {(["in_review", "approved", "declined"] as const).map((next) => {
                          const Icon = creditActionIcon(next);
                          return (
                            <Button
                              key={next}
                              size="sm"
                              variant="outline"
                              className="rounded-full border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                              disabled={updateCreditApplicationPending}
                              onClick={() => {
                                confirmAction(
                                  `Set credit application #${item.id} to ${next.replaceAll("_", " ")}?`,
                                  () => onUpdateCreditApplication({ id: item.id, status: next }),
                                  "This updates credit status for both broker and customer."
                                );
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              Set {next.replaceAll("_", " ")}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl border border-ink-200/80 bg-ink-50/40 p-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={creditNotes[item.id] ?? item.broker_note ?? ""}
                          onChange={(e) => setCreditNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Broker note"
                          className="min-w-0 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full border-brand-200 text-brand-700 hover:bg-brand-50"
                          disabled={updateCreditApplicationPending}
                          onClick={() => {
                            confirmAction(
                              `Save broker note for credit application #${item.id}?`,
                              () =>
                                onUpdateCreditApplication({
                                  id: item.id,
                                  broker_note: creditNotes[item.id] ?? item.broker_note ?? ""
                                }),
                              "This note is visible in broker workflow."
                            );
                          }}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Save note
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/80 via-white to-white p-2.5">
                      <div className="flex flex-wrap gap-2">
                        {(["in_review", "approved", "declined"] as const).map((next) => {
                          const Icon = creditActionIcon(next);
                          return (
                            <Button
                              key={next}
                              size="sm"
                              variant="outline"
                              className="rounded-full border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                              disabled={updateCreditApplicationPending}
                              onClick={() => {
                                confirmAction(
                                  `Set credit application #${item.id} to ${next.replaceAll("_", " ")}?`,
                                  () => onUpdateCreditApplication({ id: item.id, status: next }),
                                  "This updates credit status for both broker and customer."
                                );
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              Set {next.replaceAll("_", " ")}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-ink-200/80 bg-ink-50/40 p-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={creditNotes[item.id] ?? item.broker_note ?? ""}
                          onChange={(e) => setCreditNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Broker note"
                          className="min-w-0 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full border-brand-200 text-brand-700 hover:bg-brand-50"
                          disabled={updateCreditApplicationPending}
                          onClick={() =>
                            onUpdateCreditApplication({
                              id: item.id,
                              broker_note: creditNotes[item.id] ?? item.broker_note ?? ""
                            })
                          }
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Save note
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              <CreditApplicationDetailPanel payload={item.payload_json ?? undefined} applicationId={item.id} />
            </div>
          ))}
          {creditApplications.length === 0 && <p className="text-sm text-ink-600">No credit applications found.</p>}
        </div>
      </CardContent>
    </Card>
  );

  const docsCard = (
    <Card className={`border-ink-200 bg-white ${!isFull ? "mt-6" : ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-brand-600" />
          Document Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
          <Badge>{docSubmissions.length} submissions</Badge>
          <Badge className="bg-red-50 text-red-700">{pendingDocCount} pending review</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            placeholder="Search by VIN"
            className="max-w-sm"
          />
          <div className="flex gap-2">
            {DOC_STATUS_FILTERS.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={docStatusFilter === status ? "default" : "outline"}
                onClick={() => setDocStatusFilter(status)}
              >
                {status.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
        </div>
        <div
          className={
            isSuperAdmin
              ? "grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2"
              : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {docSubmissions.map((item) => (
            <div
              key={item.id}
              className={`min-w-0 rounded-2xl border border-ink-200/90 p-4 shadow-luxe-soft ${docStatusCardGradientClass(item.status)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-900">
                  Docs #{item.id} | {item.customer_name ?? item.customer_email ?? "Customer"} | VIN {item.vin ?? "-"}
                </p>
                <Badge className={docStatusBadgeClass(item.status)}>{item.status ?? "submitted"}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Submitted: {formatDateTime(item.created_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Contact: {item.customer_email ?? "-"}
                </span>
              </div>
              {isSuperAdmin && isFull && (
                <div className="mt-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-ink-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">Review Owner</p>
                    <Badge className="border border-brand-200 bg-white text-brand-700">
                      {item.reviewed_at ? "Reviewed" : "Pending review"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
                    <span className="inline-flex items-center gap-1">
                      <UserRoundCheck className="h-3.5 w-3.5 text-brand-700" />
                      Approved/Reviewed by: {item.reviewed_by_name ?? "Not assigned"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-brand-700" />
                      {item.reviewed_by_email ?? "No email"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5 text-brand-700" />
                      Reviewed at: {formatDateTime(item.reviewed_at)}
                    </span>
                  </div>
                </div>
              )}
              {isFull ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewDoc(item.id, "drivers_license")}>
                      <Eye className="h-3.5 w-3.5" />
                      View DL
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => viewDoc(item.id, "insurance")}>
                      <Eye className="h-3.5 w-3.5" />
                      View insurance
                    </Button>
                  </div>
                  {!isSuperAdmin && (
                    <>
                      <div className="mt-2 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/80 via-white to-white p-2.5">
                        <div className="flex flex-wrap gap-2">
                          {(["in_review", "approved", "rejected"] as const).map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              variant="outline"
                              className="rounded-full border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                              disabled={updateDocSubmissionPending}
                              onClick={() => {
                                confirmAction(
                                  `Set document submission #${item.id} to ${next.replaceAll("_", " ")}?`,
                                  () => onUpdateDocSubmission({ id: item.id, status: next }),
                                  "This updates document status for both broker and customer."
                                );
                              }}
                            >
                              Set {next.replaceAll("_", " ")}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 rounded-xl border border-ink-200/80 bg-ink-50/40 p-2.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={docNotes[item.id] ?? item.broker_note ?? ""}
                            onChange={(e) => setDocNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Broker note"
                            className="min-w-0 flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 rounded-full border-brand-200 text-brand-700 hover:bg-brand-50"
                            disabled={updateDocSubmissionPending}
                            onClick={() => {
                              confirmAction(
                                `Save broker note for document submission #${item.id}?`,
                                () =>
                                  onUpdateDocSubmission({
                                    id: item.id,
                                    broker_note: docNotes[item.id] ?? item.broker_note ?? ""
                                  }),
                                "This note is visible in broker workflow."
                              );
                            }}
                          >
                            Save note
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewDoc(item.id, "drivers_license")}>
                    <Eye className="h-3.5 w-3.5" />
                    View DL
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => viewDoc(item.id, "insurance")}>
                    <Eye className="h-3.5 w-3.5" />
                    View insurance
                  </Button>
                  {!isSuperAdmin && (
                    <>
                      {(["in_review", "approved", "rejected"] as const).map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant="outline"
                          className="rounded-full border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                          disabled={updateDocSubmissionPending}
                          onClick={() => {
                            confirmAction(
                              `Set document #${item.id} to ${next.replaceAll("_", " ")}?`,
                              () => onUpdateDocSubmission({ id: item.id, status: next }),
                              "This updates document status."
                            );
                          }}
                        >
                          Set {next.replaceAll("_", " ")}
                        </Button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {docSubmissions.length === 0 && <p className="text-sm text-ink-600">No document submissions found.</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (isFull) {
    return (
      <div className="space-y-6">
        <div ref={docsQueueRef}>{creditCard}</div>
        {docsCard}
      </div>
    );
  }

  return (
    <div>
      {creditCard}
      {docsCard}
    </div>
  );
}
