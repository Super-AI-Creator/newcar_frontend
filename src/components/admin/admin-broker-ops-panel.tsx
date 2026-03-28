"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  MessageCircle,
  Send,
  UserRoundCheck
} from "lucide-react";

import type { Deal, Message, Vehicle } from "@/lib/api";
import { AdminDealCard } from "@/components/admin/admin-deal-card";
import {
  DEAL_NEXT_STATUS,
  formatCurrency,
  formatDateTime,
  formatMileage,
  HeaderStatusChip,
  PIPELINE_STEPS,
  statusLabel,
  vehicleTitle
} from "@/components/admin/admin-broker-ops-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type BrokerOpsThread = {
  key: string;
  userId: string;
  vin?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  items: Message[];
  lastAt: string;
  lastSenderType: string;
  needsReply: boolean;
  customerMessageCount: number;
  brokerMessageCount: number;
};

type ConfirmAction = (title: string, onConfirm: () => void, description?: string) => void;

type DocCreditStatus = { id?: number; status?: string | null; created_at?: string | null };

/** full: pipeline + deal list + chats; pipeline_chats: pipeline summary + chats; deals_only: deal list + filters (for Leads tab expand). */
export type AdminBrokerOpsPanelMode = "full" | "pipeline_chats" | "deals_only";

export type AdminBrokerOpsPanelProps = {
  panelMode?: AdminBrokerOpsPanelMode;
  dealPipelineRef: RefObject<HTMLElement>;
  conversationRef: RefObject<HTMLElement>;
  messageScrollRef: RefObject<HTMLDivElement>;

  deals: Deal[];
  threads: BrokerOpsThread[];
  vehiclesByVin: Record<string, Vehicle>;
  latestDocByDealKey: Record<string, DocCreditStatus>;
  latestDocByVin: Record<string, DocCreditStatus>;
  latestCreditByDealKey: Record<string, DocCreditStatus>;
  latestCreditByVin: Record<string, DocCreditStatus>;
  offerOverrideByVin: Record<string, { source?: string | null }>;

  dealSearch: string;
  setDealSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;

  assignBrokerEmails: Record<number, string>;
  setAssignBrokerEmails: Dispatch<SetStateAction<Record<number, string>>>;
  scheduleDates: Record<number, string>;
  setScheduleDates: Dispatch<SetStateAction<Record<number, string>>>;
  scheduleAddress: Record<number, string>;
  setScheduleAddress: Dispatch<SetStateAction<Record<number, string>>>;
  expandedDealId: number | null;
  setExpandedDealId: (id: number | null) => void;
  highlightedDealId: number | null;

  conversationSearch: string;
  setConversationSearch: (v: string) => void;
  selectedThreadKey: string | null;
  setSelectedThreadKey: (v: string | null) => void;
  brokerReplyByThread: Record<string, string>;
  setBrokerReplyByThread: Dispatch<SetStateAction<Record<string, string>>>;

  confirmAction: ConfirmAction;
  focusConversationForDeal: (deal: Deal) => void;
  focusDealInPipeline: (deal: Deal) => void;
  openDocsQueueForVin: (vin: string) => void;
  openCreditQueueForVin: (vin: string) => void;
  requestDocsForDeal: (deal: Deal) => void;
  requestCreditForDeal: (deal: Deal) => void;
  setDocStatusForDeal: (submissionId: number, status: string) => void;
  setCreditStatusForDeal: (applicationId: number, status: string) => void;
  toggleLeaseSpecialForDeal: (deal: Deal, vehicle?: Vehicle) => void;

  saveDealMetaMutation: UseMutationResult<
    unknown,
    unknown,
    { dealId: number; assigned_broker_email?: string; delivery_scheduled_at?: string; delivery_address?: string }
  >;
  updateDealMutation: UseMutationResult<unknown, unknown, { dealId: number; status: string }>;
  messagesQuery: UseQueryResult<{ items?: Message[] }>;
  sendBrokerReplyMutation: UseMutationResult<unknown, unknown, { customer_user_id: number; vin?: string; message: string }>;
  updateDocSubmissionMutation: UseMutationResult<unknown, unknown, any>;
  updateCreditApplicationMutation: UseMutationResult<unknown, unknown, any>;
  upsertOfferOverrideMutation: UseMutationResult<unknown, unknown, any>;
  deleteOfferOverrideMutation: UseMutationResult<unknown, unknown, any>;
  dealEventsQuery: UseQueryResult<{ items?: Array<{ id: number; event_type: string; message?: string | null; created_at?: string | null }> }>;
};

export function AdminBrokerOpsPanel({
  panelMode = "full",
  dealPipelineRef,
  conversationRef,
  messageScrollRef,
  deals,
  threads,
  vehiclesByVin,
  latestDocByDealKey,
  latestDocByVin,
  latestCreditByDealKey,
  latestCreditByVin,
  offerOverrideByVin,
  dealSearch,
  setDealSearch,
  statusFilter,
  setStatusFilter,
  assignBrokerEmails,
  setAssignBrokerEmails,
  scheduleDates,
  setScheduleDates,
  scheduleAddress,
  setScheduleAddress,
  expandedDealId,
  setExpandedDealId,
  highlightedDealId,
  conversationSearch,
  setConversationSearch,
  selectedThreadKey,
  setSelectedThreadKey,
  brokerReplyByThread,
  setBrokerReplyByThread,
  confirmAction,
  focusConversationForDeal,
  focusDealInPipeline,
  openDocsQueueForVin,
  openCreditQueueForVin,
  requestDocsForDeal,
  requestCreditForDeal,
  setDocStatusForDeal,
  setCreditStatusForDeal,
  toggleLeaseSpecialForDeal,
  saveDealMetaMutation,
  updateDealMutation,
  messagesQuery,
  sendBrokerReplyMutation,
  updateDocSubmissionMutation,
  updateCreditApplicationMutation,
  upsertOfferOverrideMutation,
  deleteOfferOverrideMutation,
  dealEventsQuery
}: AdminBrokerOpsPanelProps) {
  const showPipelineHeader = panelMode === "full" || panelMode === "pipeline_chats";
  const showDealQueue = panelMode === "full" || panelMode === "deals_only";
  const showConversationsSection = panelMode === "full" || panelMode === "pipeline_chats";

  const activeDeals = deals.filter((deal) => !["delivered", "cancelled"].includes(deal.status)).length;
  const unassignedDeals = deals.filter((deal) => !deal.assigned_broker_email && !["delivered", "cancelled"].includes(deal.status)).length;
  const deliveryQueueDeals = deals.filter((deal) => ["locked", "docs_pending"].includes(deal.status)).length;
  const replyNeededCount = threads.filter((thread) => thread.needsReply).length;

  const selectedStatusIndex = Math.max(0, PIPELINE_STEPS.findIndex((step) => step.key === statusFilter));
  const pipelineCounts = PIPELINE_STEPS.map((step) => deals.filter((deal) => deal.status === step.key).length);
  const filteredStatusCount = statusFilter === "all" ? deals.length : deals.filter((deal) => deal.status === statusFilter).length;

  const filteredDeals = useMemo(() => {
    const q = dealSearch.trim().toLowerCase();
    return deals.filter((deal) => {
      if (statusFilter !== "all" && deal.status !== statusFilter) return false;
      if (!q) return true;
      return (
        deal.vin.toLowerCase().includes(q) ||
        (deal.customer_name ?? "").toLowerCase().includes(q) ||
        (deal.customer_email ?? "").toLowerCase().includes(q) ||
        String(deal.id).includes(q)
      );
    });
  }, [deals, dealSearch, statusFilter]);

  const filteredThreads = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      return (
        (thread.customerName ?? "").toLowerCase().includes(q) ||
        (thread.customerEmail ?? "").toLowerCase().includes(q) ||
        (thread.vin ?? "").toLowerCase().includes(q) ||
        thread.userId.toLowerCase().includes(q)
      );
    });
  }, [threads, conversationSearch]);

  const activeThread = useMemo(() => {
    if (filteredThreads.length === 0) return null;
    if (!selectedThreadKey) return filteredThreads[0];
    return filteredThreads.find((t) => t.key === selectedThreadKey) ?? filteredThreads[0];
  }, [filteredThreads, selectedThreadKey]);

  const activeThreadDraft = activeThread ? (brokerReplyByThread[activeThread.key] ?? "") : "";

  const activeThreadDeal = useMemo(() => {
    if (!activeThread) return null;
    const userId = Number(activeThread.userId);
    const matches = deals.filter((deal) => {
      const sameUser = Number.isInteger(userId) ? deal.user_id === userId : true;
      const sameVin = activeThread.vin ? deal.vin === activeThread.vin : true;
      return sameUser && sameVin;
    });
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];
  }, [activeThread, deals]);

  const activeThreadVehicle = activeThread?.vin ? vehiclesByVin[activeThread.vin] : undefined;
  const activeThreadDocStatus =
    activeThread && activeThread.vin
      ? latestDocByDealKey[`${activeThread.userId}|${activeThread.vin}`] ?? latestDocByVin[activeThread.vin]
      : undefined;
  const activeThreadCreditStatus =
    activeThread && activeThread.vin
      ? latestCreditByDealKey[`${activeThread.userId}|${activeThread.vin}`] ?? latestCreditByVin[activeThread.vin]
      : undefined;

  const scrollMessagesToBottom = () => {
    if (!messageScrollRef.current) return;
    messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
  };

  useLayoutEffect(() => {
    scrollMessagesToBottom();
    const frame = requestAnimationFrame(scrollMessagesToBottom);
    return () => cancelAnimationFrame(frame);
  }, [activeThread?.key, activeThread?.lastAt, messagesQuery.data?.items?.length, sendBrokerReplyMutation.isSuccess]);

  const sendReplyForActiveThread = () => {
    if (!activeThread) return;
    const customerUserId = Number(activeThread.userId);
    if (!Number.isInteger(customerUserId) || customerUserId <= 0) return;
    const message = activeThreadDraft.trim();
    if (!message) return;
    sendBrokerReplyMutation.mutate({
      customer_user_id: customerUserId,
      vin: activeThread.vin,
      message
    });
  };

  const moveActiveThreadDealToNextStep = () => {
    if (!activeThreadDeal) return;
    const nextStatus = DEAL_NEXT_STATUS[activeThreadDeal.status];
    if (!nextStatus) return;
    confirmAction(
      `Move deal #${activeThreadDeal.id} to ${statusLabel(nextStatus)}?`,
      () => updateDealMutation.mutate({ dealId: activeThreadDeal.id, status: nextStatus }),
      "This will update the customer-visible deal timeline."
    );
  };

  const pipelineStepGrid = (
    <div className="grid gap-2 rounded-xl border border-ink-200 bg-white p-3 md:grid-cols-6">
      {PIPELINE_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isSelected = statusFilter === step.key;
        const isInSelectionPath = statusFilter !== "all" && index <= selectedStatusIndex;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => setStatusFilter(statusFilter === step.key ? "all" : step.key)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              isSelected
                ? "border-brand-600 bg-brand-50 shadow-sm"
                : isInSelectionPath
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-ink-200 bg-ink-50 hover:border-brand-300"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className={`h-4 w-4 ${isSelected ? "text-brand-700" : isInSelectionPath ? "text-emerald-700" : "text-ink-600"}`} />
              <span className="text-sm font-semibold text-ink-900">{pipelineCounts[index]}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-ink-700">{step.label}</p>
          </button>
        );
      })}
    </div>
  );

  const dealSearchRow = (
    <div className="flex flex-wrap gap-2">
      <Input
        value={dealSearch}
        onChange={(e) => setDealSearch(e.target.value)}
        placeholder="Search by VIN, deal ID, customer name, or email"
        className="max-w-xl"
      />
      {(dealSearch || statusFilter !== "all") && (
        <Button
          variant="outline"
          onClick={() => {
            setDealSearch("");
            setStatusFilter("all");
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  const dealCardsList = (
    <>
      {filteredDeals.length === 0 && <p className="text-sm text-ink-600">No deals match current filters.</p>}
      <div className="space-y-4">
        {filteredDeals.slice(0, 80).map((deal) => (
          <AdminDealCard
            key={deal.id}
            deal={deal}
            assignBrokerEmails={assignBrokerEmails}
            setAssignBrokerEmails={setAssignBrokerEmails}
            scheduleDates={scheduleDates}
            setScheduleDates={setScheduleDates}
            scheduleAddress={scheduleAddress}
            setScheduleAddress={setScheduleAddress}
            saveDealMeta={(payload) => {
              confirmAction(
                `Save deal details for deal #${payload.dealId}?`,
                () => saveDealMetaMutation.mutate(payload),
                "This will update broker assignment and/or delivery details."
              );
            }}
            moveDeal={(dealId, status) => {
              confirmAction(
                `Move deal #${dealId} to ${statusLabel(status)}?`,
                () => updateDealMutation.mutate({ dealId, status }),
                "This will update the customer-visible deal timeline."
              );
            }}
            cancelDeal={(dealId) => {
              confirmAction(
                `Cancel deal #${dealId}?`,
                () => updateDealMutation.mutate({ dealId, status: "cancelled" }),
                "This will stop the active workflow for this deal."
              );
            }}
            openConversationForDeal={focusConversationForDeal}
            isSaving={saveDealMetaMutation.isPending || updateDealMutation.isPending}
            isJumpingToConversation={messagesQuery.isLoading}
            isHighlighted={highlightedDealId === deal.id}
            vehicle={vehiclesByVin[deal.vin]}
            docStatus={latestDocByDealKey[`${deal.user_id}|${deal.vin}`] ?? latestDocByVin[deal.vin]}
            openDocsQueue={openDocsQueueForVin}
            requestDocsFromCustomer={requestDocsForDeal}
            updateDocStatusForDeal={setDocStatusForDeal}
            isUpdatingDocs={updateDocSubmissionMutation.isPending || sendBrokerReplyMutation.isPending}
            creditStatus={latestCreditByDealKey[`${deal.user_id}|${deal.vin}`] ?? latestCreditByVin[deal.vin]}
            openCreditQueue={openCreditQueueForVin}
            requestCreditFromCustomer={requestCreditForDeal}
            updateCreditStatusForDeal={setCreditStatusForDeal}
            isUpdatingCredit={updateCreditApplicationMutation.isPending || sendBrokerReplyMutation.isPending}
            leaseSpecialSource={offerOverrideByVin[deal.vin]?.source ?? null}
            toggleLeaseSpecial={toggleLeaseSpecialForDeal}
            isTogglingLeaseSpecial={upsertOfferOverrideMutation.isPending || deleteOfferOverrideMutation.isPending}
            expandedDealId={expandedDealId}
            setExpandedDealId={setExpandedDealId}
            eventsState={{
              isLoading: dealEventsQuery.isLoading,
              isError: dealEventsQuery.isError,
              items: dealEventsQuery.data?.items ?? []
            }}
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      {showPipelineHeader && (
        <section ref={dealPipelineRef}>
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-brand-600" />
                Deal Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Open deals</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{activeDeals}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Unassigned</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-700">{unassignedDeals}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Delivery queue</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{deliveryQueueDeals}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Needs broker reply</p>
                  <p className="mt-1 text-2xl font-semibold text-red-600">{replyNeededCount}</p>
                </div>
              </div>

              {statusFilter !== "all" && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                  Viewing <span className="font-semibold">{filteredStatusCount}</span> deals in{" "}
                  <span className="font-semibold">{statusLabel(statusFilter)}</span>
                </div>
              )}

              {pipelineStepGrid}

              {panelMode === "full" && (
                <>
                  {dealSearchRow}
                  {dealCardsList}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {panelMode === "deals_only" && (
        <section ref={dealPipelineRef}>
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-brand-600" />
                Deal queue &amp; actions
              </CardTitle>
              <p className="text-sm text-ink-600">
                Same deal cards as before — pipeline stage filters apply here and on Broker Operations.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusFilter !== "all" && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                  Viewing <span className="font-semibold">{filteredStatusCount}</span> deals in{" "}
                  <span className="font-semibold">{statusLabel(statusFilter)}</span>
                </div>
              )}
              {pipelineStepGrid}
              {dealSearchRow}
              {dealCardsList}
            </CardContent>
          </Card>
        </section>
      )}

      {showConversationsSection && (
      <section ref={conversationRef}>
        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-brand-600" />
              Customer Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
              <Badge>{threads.length} threads</Badge>
              <Badge className="bg-red-50 text-red-700">{replyNeededCount} need reply</Badge>
              <span>Priority inbox sorted by pending customer response</span>
            </div>
            <Input
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search by customer, email, VIN, or user ID"
              className="max-w-xl"
            />
            {threads.length === 0 && <p className="text-sm text-ink-600">No shopper messages yet.</p>}
            {threads.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="space-y-2 rounded-xl border border-ink-200 bg-ink-50 p-2">
                  {filteredThreads.map((thread) => {
                    const threadVehicle = thread.vin ? vehiclesByVin[thread.vin] : undefined;
                    return (
                      <button
                        key={thread.key}
                        type="button"
                        onClick={() => setSelectedThreadKey(thread.key)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          activeThread?.key === thread.key
                            ? "border-brand-600 bg-brand-50 shadow-sm"
                            : "border-ink-200 bg-white hover:border-brand-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {thread.customerName ?? thread.customerEmail ?? `User ${thread.userId}`}
                          </p>
                          <div className="flex items-center gap-2">
                            {thread.needsReply && <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="Needs reply" />}
                            <span className="text-[11px] text-ink-500">{thread.items.length}</span>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-xs text-ink-600">VIN: {thread.vin ?? "-"}</p>
                        <p className="truncate text-[11px] text-ink-600">{vehicleTitle(threadVehicle, thread.vin)}</p>
                        <p className="text-[11px] text-ink-500">Price: {formatCurrency(threadVehicle?.listed_price)}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-ink-500">{formatDateTime(thread.lastAt)}</p>
                          <p className={`text-[11px] font-medium ${thread.needsReply ? "text-red-600" : "text-emerald-700"}`}>
                            {thread.needsReply ? "Needs reply" : "Up to date"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredThreads.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-ink-500">No threads match the current search.</p>
                  )}
                </div>
                <div className="rounded-xl border border-ink-200 bg-white p-4">
                  {activeThread && (
                    <>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-ink-200 pb-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">
                            {activeThread.customerName ?? activeThread.customerEmail ?? `User ${activeThread.userId}`}
                          </p>
                          <p className="text-xs text-ink-500">
                            VIN: {activeThread.vin ?? "-"} | Customer: {activeThread.customerEmail ?? "-"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <HeaderStatusChip kind="timeline" value={activeThreadDeal?.status ?? "inquiry"} />
                          <HeaderStatusChip kind="docs" value={activeThreadDocStatus?.status ?? "not_submitted"} />
                          <HeaderStatusChip kind="credit" value={activeThreadCreditStatus?.status ?? "not_submitted"} />
                          <Badge>{activeThread.items.length} messages</Badge>
                          {activeThread.needsReply ? (
                            <Badge className="bg-red-50 text-red-700">Awaiting broker reply</Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700">Response sent</Badge>
                          )}
                        </div>
                      </div>

                      <div className="relative mb-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
                        {activeThread.vin && (
                          <Button asChild variant="outline" size="sm" className="absolute right-2 top-2 h-7 px-2 text-[11px]">
                            <Link href={`/vehicles/${encodeURIComponent(activeThread.vin)}`} target="_blank" rel="noreferrer noopener">
                              <ExternalLink className="h-3 w-3" />
                              Details
                            </Link>
                          </Button>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-20 overflow-hidden rounded-md border border-ink-200 bg-white">
                            {activeThreadVehicle?.photo ? (
                              <img
                                src={activeThreadVehicle.photo}
                                alt={vehicleTitle(activeThreadVehicle, activeThread.vin)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-500">No image</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900">{vehicleTitle(activeThreadVehicle, activeThread.vin)}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700">
                              <span>Price: {formatCurrency(activeThreadVehicle?.listed_price)}</span>
                              <span>MSRP: {formatCurrency(activeThreadVehicle?.msrp)}</span>
                              <span>Mileage: {formatMileage(activeThreadVehicle?.mileage)}</span>
                              <span>Condition: {activeThreadVehicle?.condition?.toUpperCase?.() ?? "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" disabled={!activeThreadDeal} onClick={() => activeThreadDeal && focusDealInPipeline(activeThreadDeal)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open deal in pipeline
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!activeThreadDeal || !DEAL_NEXT_STATUS[activeThreadDeal.status] || updateDealMutation.isPending}
                          onClick={moveActiveThreadDealToNextStep}
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {activeThreadDeal && DEAL_NEXT_STATUS[activeThreadDeal.status]
                            ? `Move to ${statusLabel(DEAL_NEXT_STATUS[activeThreadDeal.status] as string)}`
                            : "No next step"}
                        </Button>
                        {activeThread?.vin && (
                          <Button variant="outline" size="sm" onClick={() => openDocsQueueForVin(activeThread.vin as string)}>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Docs {activeThreadDocStatus?.status ? `(${activeThreadDocStatus.status})` : ""}
                          </Button>
                        )}
                        {activeThreadDocStatus?.created_at && (
                          <Badge className="border border-ink-200 bg-ink-50 text-ink-700">Last docs {formatDateTime(activeThreadDocStatus.created_at)}</Badge>
                        )}
                        {activeThreadCreditStatus?.created_at && (
                          <Badge className="border border-ink-200 bg-ink-50 text-ink-700">Last credit {formatDateTime(activeThreadCreditStatus.created_at)}</Badge>
                        )}
                      </div>

                      {activeThreadDeal && (
                        <div className="mb-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Document Check</p>
                              <div className="flex items-center gap-2">
                                <Badge className="border border-ink-200 bg-white text-ink-700">
                                  {(activeThreadDocStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                                </Badge>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 w-8 rounded-full p-0"
                                  onClick={() => openDocsQueueForVin(activeThreadDeal.vin)}
                                  title="Open docs queue"
                                  aria-label="Open docs queue"
                                >
                                  <FolderOpen className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => requestDocsForDeal(activeThreadDeal)}>
                                Request docs
                              </Button>
                              {activeThreadDocStatus?.id && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => setDocStatusForDeal(activeThreadDocStatus.id as number, "in_review")}>
                                    In review
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDocStatusForDeal(activeThreadDocStatus.id as number, "approved")}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDocStatusForDeal(activeThreadDocStatus.id as number, "rejected")}>
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Credit Check</p>
                              <div className="flex items-center gap-2">
                                <Badge className="border border-ink-200 bg-white text-ink-700">
                                  {(activeThreadCreditStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                                </Badge>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 w-8 rounded-full p-0"
                                  onClick={() => openCreditQueueForVin(activeThreadDeal.vin)}
                                  title="Open credit queue"
                                  aria-label="Open credit queue"
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => requestCreditForDeal(activeThreadDeal)}>
                                Request credit app
                              </Button>
                              {activeThreadCreditStatus?.id && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => setCreditStatusForDeal(activeThreadCreditStatus.id as number, "in_review")}>
                                    In review
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setCreditStatusForDeal(activeThreadCreditStatus.id as number, "approved")}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setCreditStatusForDeal(activeThreadCreditStatus.id as number, "declined")}>
                                    Decline
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messageScrollRef} className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-ink-200 bg-ink-50 p-3">
                        {activeThread.items.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${
                              message.senderType === "broker"
                                ? "ml-auto border-brand-300 bg-brand-50"
                                : "mr-auto border-ink-200 bg-white"
                            }`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                              {message.senderType === "broker" ? "Broker admin" : "Customer"}
                            </p>
                            <p className="whitespace-pre-wrap text-ink-900">{message.body}</p>
                            <p className="mt-1 text-[11px] text-ink-500">{formatDateTime(message.createdAt)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 space-y-2 border-t border-ink-200 pt-3">
                        <Textarea
                          value={activeThreadDraft}
                          onChange={(e) => {
                            if (!activeThread) return;
                            setBrokerReplyByThread((prev) => ({ ...prev, [activeThread.key]: e.target.value }));
                          }}
                          placeholder="Write reply to customer..."
                          className="min-h-[96px]"
                          onKeyDown={(event) => {
                            const canSend = !!activeThread && !!activeThreadDraft.trim() && !sendBrokerReplyMutation.isPending;
                            if (!canSend) return;
                            if (event.key !== "Enter" || event.shiftKey) return;
                            event.preventDefault();
                            sendReplyForActiveThread();
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1 text-xs text-ink-500">
                            <UserRoundCheck className="h-3.5 w-3.5" />
                            Enter/Ctrl+Enter to send, Shift+Enter for new line.
                          </p>
                          <Button disabled={sendBrokerReplyMutation.isPending || !activeThreadDraft.trim()} onClick={sendReplyForActiveThread}>
                            <Send className="mr-2 h-4 w-4" />
                            Send reply
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  {!activeThread && <p className="text-sm text-ink-600">Select a thread to review and respond.</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      )}
    </>
  );
}
