"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleUserRound,
  CalendarClock,
  ExternalLink,
  FileSpreadsheet,
  Flag,
  FolderOpen,
  History,
  Mail,
  MessageCircle,
  Phone,
  XCircle
} from "lucide-react";

import type { Deal, Vehicle } from "@/lib/api";
import { DealCuBadge } from "@/components/deal-cu-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEAL_NEXT_STATUS,
  formatCurrency,
  formatDateTime,
  formatMileage,
  HeaderStatusChip,
  statusLabel,
  toDateTimeLocal,
  vehicleTitle
} from "@/components/admin/admin-broker-ops-shared";

export type DealCardEventsState = {
  isLoading: boolean;
  isError: boolean;
  items: Array<{ id: number; event_type: string; message?: string | null; created_at?: string | null }>;
};

export type AdminDealCardProps = {
  deal: Deal;
  assignBrokerEmails: Record<number, string>;
  setAssignBrokerEmails: Dispatch<SetStateAction<Record<number, string>>>;
  scheduleDates: Record<number, string>;
  setScheduleDates: Dispatch<SetStateAction<Record<number, string>>>;
  scheduleAddress: Record<number, string>;
  setScheduleAddress: Dispatch<SetStateAction<Record<number, string>>>;
  saveDealMeta: (payload: { dealId: number; assigned_broker_email?: string; delivery_scheduled_at?: string; delivery_address?: string }) => void;
  moveDeal: (dealId: number, status: string) => void;
  cancelDeal: (dealId: number) => void;
  openConversationForDeal: (deal: Deal) => void;
  isSaving: boolean;
  isJumpingToConversation: boolean;
  isHighlighted: boolean;
  vehicle?: Vehicle;
  docStatus?: { id?: number; status?: string | null; created_at?: string | null };
  openDocsQueue: (vin: string) => void;
  requestDocsFromCustomer: (deal: Deal) => void;
  updateDocStatusForDeal: (submissionId: number, status: string) => void;
  isUpdatingDocs: boolean;
  creditStatus?: { id?: number; status?: string | null; created_at?: string | null };
  openCreditQueue: (vin: string) => void;
  requestCreditFromCustomer: (deal: Deal) => void;
  updateCreditStatusForDeal: (applicationId: number, status: string) => void;
  isUpdatingCredit: boolean;
  leaseSpecialSource?: string | null;
  toggleLeaseSpecial: (deal: Deal, vehicle?: Vehicle) => void;
  isTogglingLeaseSpecial: boolean;
  expandedDealId: number | null;
  setExpandedDealId: (dealId: number | null) => void;
  eventsState: DealCardEventsState;
};

export function AdminDealCard({
  deal,
  assignBrokerEmails,
  setAssignBrokerEmails,
  scheduleDates,
  setScheduleDates,
  scheduleAddress,
  setScheduleAddress,
  saveDealMeta,
  moveDeal,
  cancelDeal,
  openConversationForDeal,
  isSaving,
  isJumpingToConversation,
  isHighlighted,
  vehicle,
  docStatus,
  openDocsQueue,
  requestDocsFromCustomer,
  updateDocStatusForDeal,
  isUpdatingDocs,
  creditStatus,
  openCreditQueue,
  requestCreditFromCustomer,
  updateCreditStatusForDeal,
  isUpdatingCredit,
  leaseSpecialSource,
  toggleLeaseSpecial,
  isTogglingLeaseSpecial,
  expandedDealId,
  setExpandedDealId,
  eventsState
}: AdminDealCardProps) {
  const currentBrokerEmail = assignBrokerEmails[deal.id] ?? deal.assigned_broker_email ?? "";
  const currentSchedule = scheduleDates[deal.id] ?? toDateTimeLocal(deal.delivery_scheduled_at);
  const currentAddress = scheduleAddress[deal.id] ?? deal.delivery_address ?? "";
  const nextStatus = DEAL_NEXT_STATUS[deal.status];
  const isExpanded = expandedDealId === deal.id;

  return (
    <Card
      id={`deal-card-${deal.id}`}
      className={`border-ink-200 bg-white transition ${isHighlighted ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">VIN {deal.vin}</CardTitle>
            <p className="mt-1 text-xs text-ink-500">
              Deal #{deal.id} | Updated {formatDateTime(deal.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <DealCuBadge deal={deal} />
            <HeaderStatusChip kind="timeline" value={deal.status} />
            <HeaderStatusChip kind="docs" value={docStatus?.status ?? "not_submitted"} />
            <HeaderStatusChip kind="credit" value={creditStatus?.status ?? "not_submitted"} />
            <Badge>{statusLabel(deal.status)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-lg border border-ink-200 bg-ink-50 p-3">
          <Button asChild variant="outline" size="sm" className="absolute right-2 top-2 h-7 px-2 text-[11px]">
            <Link href={`/vehicles/${encodeURIComponent(deal.vin)}`} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3 w-3" />
              Details
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <div className="h-16 w-24 overflow-hidden rounded-md border border-ink-200 bg-white">
              {vehicle?.photo ? (
                <img src={vehicle.photo} alt={vehicleTitle(vehicle, deal.vin)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-500">No image</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{vehicleTitle(vehicle, deal.vin)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700">
                <span>Price: {formatCurrency(vehicle?.listed_price)}</span>
                <span>MSRP: {formatCurrency(vehicle?.msrp)}</span>
                <span>Mileage: {formatMileage(vehicle?.mileage)}</span>
                <span>Condition: {vehicle?.condition?.toUpperCase?.() ?? "-"}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-ink-500">VIN {deal.vin}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-3 pr-32">
            <div
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400/35"
              aria-hidden
            >
              <CircleUserRound className="h-24 w-24" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Customer</p>
            <div className="mt-2 space-y-1.5">
              <p className="text-sm font-semibold text-ink-900">{deal.customer_name ?? "Customer name missing"}</p>
              <p className="flex items-center gap-2 text-sm text-ink-700">
                <Mail className="h-3.5 w-3.5 text-ink-500" />
                {deal.customer_email ? <a href={`mailto:${deal.customer_email}`} className="hover:underline">{deal.customer_email}</a> : "-"}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-700">
                <Phone className="h-3.5 w-3.5 text-ink-500" />
                {deal.customer_phone ? <a href={`tel:${deal.customer_phone}`} className="hover:underline">{deal.customer_phone}</a> : "-"}
              </p>
              <p className="flex items-center gap-2 text-xs text-ink-600">
                <CalendarClock className="h-3.5 w-3.5 text-ink-500" />
                Created {formatDateTime(deal.created_at)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Assign Broker</p>
            <div className="mt-2 flex gap-2">
              <Input
                value={currentBrokerEmail}
                onChange={(e) => setAssignBrokerEmails((prev) => ({ ...prev, [deal.id]: e.target.value }))}
                placeholder="broker@company.com"
                className="h-9"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() =>
                  saveDealMeta({
                    dealId: deal.id,
                    assigned_broker_email: currentBrokerEmail.trim().toLowerCase() || undefined
                  })
                }
              >
                Save
              </Button>
            </div>
            {deal.assigned_broker_name && (
              <p className="mt-2 text-xs text-ink-500">Current: {deal.assigned_broker_name}</p>
            )}
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Delivery</p>
            <div className="mt-2 space-y-2">
              <Input
                type="datetime-local"
                value={currentSchedule}
                onChange={(e) => setScheduleDates((prev) => ({ ...prev, [deal.id]: e.target.value }))}
                className="h-9"
              />
              <Input
                value={currentAddress}
                onChange={(e) => setScheduleAddress((prev) => ({ ...prev, [deal.id]: e.target.value }))}
                placeholder="Delivery address"
                className="h-9"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() =>
                  saveDealMeta({
                    dealId: deal.id,
                    delivery_scheduled_at: currentSchedule || undefined,
                    delivery_address: currentAddress || undefined
                  })
                }
              >
                Save delivery
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div
              className="pointer-events-none absolute -bottom-8 -right-8 rounded-full bg-gradient-to-br from-sky-100/95 via-blue-100/85 to-indigo-200/70 p-6 text-blue-500/30"
              aria-hidden
            >
              <FolderOpen className="h-14 w-14" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Document Check</p>
              <div className="flex items-center gap-2">
                <Badge className="border border-ink-200 bg-white text-ink-700">
                  {(docStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                </Badge>
                <Button variant="default" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => openDocsQueue(deal.vin)} title="Open documents" aria-label="Open documents">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-600">
              {docStatus?.created_at ? `Last upload ${formatDateTime(docStatus.created_at)}` : "No documents uploaded yet for this deal."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={isUpdatingDocs} onClick={() => requestDocsFromCustomer(deal)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Request docs
              </Button>
              {docStatus?.id && (
                <>
                  <Button variant="outline" size="sm" disabled={isUpdatingDocs} onClick={() => updateDocStatusForDeal(docStatus.id as number, "in_review")}>
                    Set in review
                  </Button>
                  <Button variant="outline" size="sm" disabled={isUpdatingDocs} onClick={() => updateDocStatusForDeal(docStatus.id as number, "approved")}>
                    Set approved
                  </Button>
                  <Button variant="outline" size="sm" disabled={isUpdatingDocs} onClick={() => updateDocStatusForDeal(docStatus.id as number, "rejected")}>
                    Set rejected
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div
              className="pointer-events-none absolute -bottom-8 -right-8 rounded-full bg-gradient-to-br from-violet-100/95 via-fuchsia-100/80 to-blue-100/85 p-6 text-violet-500/30"
              aria-hidden
            >
              <FileSpreadsheet className="h-14 w-14" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Credit Check</p>
              <div className="flex items-center gap-2">
                <Badge className="border border-ink-200 bg-white text-ink-700">
                  {(creditStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0"
                  onClick={() => openCreditQueue(deal.vin)}
                  title="Open credit queue"
                  aria-label="Open credit queue"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-600">
              {creditStatus?.created_at ? `Last submission ${formatDateTime(creditStatus.created_at)}` : "No credit application submitted yet."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={isUpdatingCredit} onClick={() => requestCreditFromCustomer(deal)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Request credit app
            </Button>
              {creditStatus?.id && (
                <>
                  <Button variant="outline" size="sm" disabled={isUpdatingCredit} onClick={() => updateCreditStatusForDeal(creditStatus.id as number, "in_review")}>
                    Set in review
                  </Button>
                  <Button variant="outline" size="sm" disabled={isUpdatingCredit} onClick={() => updateCreditStatusForDeal(creditStatus.id as number, "approved")}>
                    Set approved
                  </Button>
                  <Button variant="outline" size="sm" disabled={isUpdatingCredit} onClick={() => updateCreditStatusForDeal(creditStatus.id as number, "declined")}>
                    Set declined
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 pt-3">
          <div className="flex flex-wrap gap-2">
            {nextStatus ? (
              <Button variant="outline" size="sm" disabled={isSaving} onClick={() => moveDeal(deal.id, nextStatus)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Move to {statusLabel(nextStatus)}
              </Button>
            ) : (
              <span className="text-xs text-ink-500">No next step</span>
            )}
            {!["delivered", "cancelled"].includes(deal.status) && (
              <Button variant="outline" size="sm" disabled={isSaving} onClick={() => cancelDeal(deal.id)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={isJumpingToConversation} onClick={() => openConversationForDeal(deal)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Open chat
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={leaseSpecialSource ? "default" : "outline"}
              size="sm"
              disabled={isTogglingLeaseSpecial || (leaseSpecialSource != null && leaseSpecialSource !== "broker")}
              onClick={() => toggleLeaseSpecial(deal, vehicle)}
            >
              <Flag className="mr-2 h-4 w-4" />
              {leaseSpecialSource === "broker"
                ? "Remove from Lease Specials"
                : leaseSpecialSource
                  ? `Lease Special (${leaseSpecialSource})`
                  : "Add to Lease Specials"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}>
              <History className="mr-2 h-4 w-4" />
              {isExpanded ? "Hide history" : "History"}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <p className="mb-2 text-sm font-semibold text-ink-800">Timeline</p>
            {eventsState.isLoading && <p className="text-sm text-ink-600">Loading history...</p>}
            {eventsState.isError && <p className="text-sm text-red-700">Could not load history.</p>}
            {!eventsState.isLoading && !eventsState.isError && eventsState.items.length === 0 && (
              <p className="text-sm text-ink-600">No events yet.</p>
            )}
            {!eventsState.isLoading && !eventsState.isError && eventsState.items.length > 0 && (
              <div className="space-y-2">
                {eventsState.items.map((event) => (
                  <div key={event.id} className="rounded-md border border-ink-200 bg-white p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{event.event_type}</p>
                    <p className="text-sm text-ink-800">{event.message ?? "-"}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(event.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
