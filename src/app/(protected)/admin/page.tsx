"use client";

import Link from "next/link";
import { type ChangeEvent, type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Deal, type LeadDeliveryRecord, type ManualVehicleRecord, type SeoPageSettingRecord, type Vehicle } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/components/auth-provider";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Flag,
  Handshake,
  History,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  Upload,
  XCircle,
  UserRoundCheck
} from "lucide-react";

const DEAL_STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  broker_review: "Broker review",
  offer_ready: "Offer ready",
  locked: "Locked",
  docs_pending: "Docs pending",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

const DEAL_NEXT_STATUS: Record<string, string | null> = {
  inquiry: "broker_review",
  broker_review: "offer_ready",
  offer_ready: "locked",
  locked: "docs_pending",
  docs_pending: "delivered",
  delivered: null,
  cancelled: null
};

const PIPELINE_STEPS: Array<{ key: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "inquiry", label: "Inquiry", icon: Search },
  { key: "broker_review", label: "Broker Review", icon: Handshake },
  { key: "offer_ready", label: "Offer Ready", icon: CircleDot },
  { key: "locked", label: "Approved", icon: Flag },
  { key: "docs_pending", label: "Delivery Scheduled", icon: Clock3 },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 }
];

const SEO_PRESET_PAGE_KEYS = ["site_default", "home", "search", "lease_specials", "reviews", "credit_application"] as const;

type ManualVehicleUpsertPayload = {
  vehicle_type?: "new" | "used";
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  msrp?: number | null;
  listed_price?: number | null;
  mileage?: number | null;
  condition?: string | null;
  photos?: string[];
  details?: Record<string, unknown> | null;
  dealer_name?: string | null;
  dealer_phone?: string | null;
  listing_url?: string | null;
  carfax_url?: string | null;
  down_payment?: number | null;
  monthly_payment?: number | null;
  discounted_price?: number | null;
  term_months?: number | null;
  miles_per_year?: number | null;
};

function normalizePhotos(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toManualPayloadFromVehicle(vehicle: Vehicle | undefined): ManualVehicleUpsertPayload {
  const conditionRaw = (vehicle?.condition ?? "").toString().trim().toLowerCase();
  return {
    vehicle_type: (vehicle?.vehicle_type ?? "new") === "used" ? "used" : "new",
    year: typeof vehicle?.year === "number" ? vehicle.year : null,
    make: vehicle?.make?.trim() || null,
    model: vehicle?.model?.trim() || null,
    trim: vehicle?.trim?.trim() || null,
    listed_price: numberOrNull(vehicle?.listed_price),
    msrp: numberOrNull(vehicle?.msrp),
    mileage: typeof vehicle?.mileage === "number" ? vehicle.mileage : null,
    condition: conditionRaw && conditionRaw !== "all" ? conditionRaw : null,
    dealer_name: vehicle?.dealer_name?.trim() || null,
    dealer_phone: vehicle?.dealer_phone?.trim() || null,
    listing_url: vehicle?.listing_url?.trim() || null,
    carfax_url: vehicle?.vehicle_history_url?.trim() || vehicle?.history_url?.trim() || null,
    photos: normalizePhotos([...(vehicle?.photos ?? []), vehicle?.photo]),
    down_payment: numberOrNull(vehicle?.down),
    monthly_payment: numberOrNull(vehicle?.monthly),
    discounted_price: numberOrNull(vehicle?.discounted),
    term_months: typeof vehicle?.term_months === "number" ? vehicle.term_months : null,
    miles_per_year: typeof vehicle?.miles_per_year === "number" ? vehicle.miles_per_year : null
  };
}

function statusLabel(status: string) {
  return DEAL_STATUS_LABELS[status] ?? status;
}

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";
  const normalized = raw.replace(" ", "T").replace("Z", "");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}T${match[2]}:${match[3]}`;
  }
  return "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
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

function leadDeliveryBadgeClass(status?: string | null) {
  const value = (status ?? "").toLowerCase();
  if (value === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (value === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-ink-200 bg-white text-ink-600";
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
  const Icon = kind === "timeline" ? History : kind === "docs" ? FolderOpen : FileSpreadsheet;
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

function creditActionIcon(status: string) {
  if (status === "approved") return CheckCircle2;
  if (status === "declined") return XCircle;
  return Clock3;
}

function DealCard({
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
}: {
  deal: Deal;
  assignBrokerEmails: Record<number, string>;
  setAssignBrokerEmails: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  scheduleDates: Record<number, string>;
  setScheduleDates: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  scheduleAddress: Record<number, string>;
  setScheduleAddress: React.Dispatch<React.SetStateAction<Record<number, string>>>;
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
  eventsState: {
    isLoading: boolean;
    isError: boolean;
    items: Array<{ id: number; event_type: string; message?: string | null; created_at?: string | null }>;
  };
}) {
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
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
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

        <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Document Check</p>
            <Badge className="border border-ink-200 bg-white text-ink-700">
              {(docStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
            </Badge>
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

        <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Credit Check</p>
            <Badge className="border border-ink-200 bg-white text-ink-700">
              {(creditStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-600">
            {creditStatus?.created_at ? `Last submission ${formatDateTime(creditStatus.created_at)}` : "No credit application submitted yet."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={isUpdatingCredit} onClick={() => requestCreditFromCustomer(deal)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Request credit app
            </Button>
            <Button variant="outline" size="sm" onClick={() => openCreditQueue(deal.vin)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Open credit queue
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

        <div className="flex flex-wrap gap-2 border-t border-ink-200 pt-3">
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
          <Button variant="outline" size="sm" onClick={() => openDocsQueue(deal.vin)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Docs {docStatus?.status ? `(${docStatus.status})` : ""}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}>
            <History className="mr-2 h-4 w-4" />
            {isExpanded ? "Hide history" : "History"}
          </Button>
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

export default function AdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isBrokerWorkspace = !isSuperAdmin;
  const { toast } = useToast();
  const [lenderName, setLenderName] = useState("Default Lender");
  const [creditTier, setCreditTier] = useState("B");
  const [vehicleType, setVehicleType] = useState("all");
  const [apr, setApr] = useState("5.0");
  const [maxTerm, setMaxTerm] = useState("72");

  const [assignBrokerEmails, setAssignBrokerEmails] = useState<Record<number, string>>({});
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const [scheduleAddress, setScheduleAddress] = useState<Record<number, string>>({});
  const [expandedDealId, setExpandedDealId] = useState<number | null>(null);
  const [highlightedDealId, setHighlightedDealId] = useState<number | null>(null);
  const [dealSearch, setDealSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [brokerReplyByThread, setBrokerReplyByThread] = useState<Record<string, string>>({});
  const [creditStatusFilter, setCreditStatusFilter] = useState("all");
  const [creditSearch, setCreditSearch] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [creditNotes, setCreditNotes] = useState<Record<number, string>>({});
  const [docNotes, setDocNotes] = useState<Record<number, string>>({});
  const [offerSourceFilter, setOfferSourceFilter] = useState<"all" | "sheet" | "dealer" | "broker">("all");
  const [offerSearch, setOfferSearch] = useState("");
  const [offerYear, setOfferYear] = useState("");
  const [offerMake, setOfferMake] = useState("");
  const [offerModel, setOfferModel] = useState("");
  const [offerVehicleType, setOfferVehicleType] = useState<"all" | "new" | "used">("all");
  const [offerVin, setOfferVin] = useState("");
  const [offerDownPayment, setOfferDownPayment] = useState("");
  const [offerMonthlyPayment, setOfferMonthlyPayment] = useState("");
  const [offerDiscountedPrice, setOfferDiscountedPrice] = useState("");
  const [offerTermMonths, setOfferTermMonths] = useState("");
  const [offerMilesPerYear, setOfferMilesPerYear] = useState("");
  const [featuredMonth, setFeaturedMonth] = useState(currentMonthKey());
  const [featuredVinInput, setFeaturedVinInput] = useState("");
  const [featuredVinsDraft, setFeaturedVinsDraft] = useState<string[]>([]);
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualVin, setManualVin] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualMake, setManualMake] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualTrim, setManualTrim] = useState("");
  const [manualVehicleType, setManualVehicleType] = useState<"new" | "used">("new");
  const [manualListedPrice, setManualListedPrice] = useState("");
  const [manualMsrp, setManualMsrp] = useState("");
  const [manualMileage, setManualMileage] = useState("");
  const [manualCondition, setManualCondition] = useState("");
  const [manualDealerName, setManualDealerName] = useState("");
  const [manualDealerPhone, setManualDealerPhone] = useState("");
  const [manualListingUrl, setManualListingUrl] = useState("");
  const [manualPhotoUrls, setManualPhotoUrls] = useState<string[]>([""]);
  const [manualDownPayment, setManualDownPayment] = useState("");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");
  const [manualDiscountedPrice, setManualDiscountedPrice] = useState("");
  const [seoPageKey, setSeoPageKey] = useState<string>("home");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState("");
  const [seoOgTitle, setSeoOgTitle] = useState("");
  const [seoOgDescription, setSeoOgDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [seoRobots, setSeoRobots] = useState("index,follow");
  const [seoJsonLd, setSeoJsonLd] = useState("{}");
  const [seoIsActive, setSeoIsActive] = useState(true);
  const [leadDeliveryStatusFilter, setLeadDeliveryStatusFilter] = useState<"all" | "pending" | "sent" | "failed" | "skipped">("all");
  const [leadDeliverySearch, setLeadDeliverySearch] = useState("");
  const [adminTab, setAdminTab] = useState<"broker_ops" | "credit_docs" | "admin_data">("broker_ops");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  });
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const dealPipelineRef = useRef<HTMLElement | null>(null);
  const conversationRef = useRef<HTMLElement | null>(null);
  const docsQueueRef = useRef<HTMLDivElement | null>(null);
  const manualVehicleControlRef = useRef<HTMLDivElement | null>(null);
  const normalizedSeoPageKey = seoPageKey.trim().toLowerCase();
  const isValidSeoPageKey = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalizedSeoPageKey);

  const sourcesQuery = useQuery({
    queryKey: ["admin-sources"],
    queryFn: api.adminSources,
    enabled: isBrokerWorkspace
  });
  const statusQuery = useQuery({
    queryKey: ["admin-sync-status"],
    queryFn: api.syncStatus,
    enabled: isBrokerWorkspace
  });
  const generalStatusQuery = useQuery({
    queryKey: ["admin-general-status"],
    queryFn: api.adminGeneralStatus,
    enabled: isSuperAdmin
  });
  const homepageFeaturedQuery = useQuery({
    queryKey: ["admin-homepage-featured", featuredMonth],
    queryFn: () => api.adminHomepageFeatured({ month: featuredMonth }),
    enabled: isSuperAdmin
  });
  const manualVehiclesQuery = useQuery({
    queryKey: ["admin-manual-vehicles", manualSearch],
    queryFn: () => api.adminManualVehicles({ q: manualSearch || undefined, limit: 200 }),
    enabled: isSuperAdmin
  });
  const seoSettingsQuery = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: () => api.adminSeoSettings({ include_inactive: true, limit: 200 }),
    enabled: isSuperAdmin
  });
  const seoSettingQuery = useQuery({
    queryKey: ["admin-seo-setting", normalizedSeoPageKey],
    queryFn: () => api.adminSeoSetting(normalizedSeoPageKey),
    enabled: isSuperAdmin && isValidSeoPageKey && normalizedSeoPageKey.length > 0,
    retry: false
  });
  const leadDeliveryQuery = useQuery({
    queryKey: ["admin-lead-delivery", leadDeliveryStatusFilter, leadDeliverySearch],
    queryFn: () =>
      api.adminLeadDelivery({
        status: leadDeliveryStatusFilter === "all" ? undefined : leadDeliveryStatusFilter,
        q: leadDeliverySearch || undefined,
        limit: 200
      }),
    enabled: isBrokerWorkspace
  });
  const dealsQuery = useQuery({ queryKey: ["admin-deals-queue"], queryFn: api.brokerQueue, enabled: isBrokerWorkspace });
  const messagesQuery = useQuery({ queryKey: ["admin-messages"], queryFn: api.messages, enabled: isBrokerWorkspace });
  const lenderRatesQuery = useQuery({ queryKey: ["admin-lender-rates"], queryFn: api.lenderRates, enabled: isBrokerWorkspace });
  const offerOverridesQuery = useQuery({
    queryKey: ["admin-offer-overrides", offerSourceFilter, offerSearch],
    queryFn: () =>
      api.adminOfferOverrides({
        source: offerSourceFilter === "all" ? undefined : offerSourceFilter,
        q: offerSearch || undefined,
        limit: 200
      }),
    enabled: isBrokerWorkspace
  });
  const creditApplicationsQuery = useQuery({
    queryKey: ["admin-credit-applications", creditStatusFilter, creditSearch],
    queryFn: () =>
      api.brokerCreditApplications({
        status: creditStatusFilter === "all" ? undefined : creditStatusFilter,
        q: creditSearch || undefined,
        page_size: 50
      }),
    enabled: isBrokerWorkspace || isSuperAdmin
  });
  const docSubmissionsQuery = useQuery({
    queryKey: ["admin-doc-submissions", docStatusFilter, docSearch],
    queryFn: () =>
      api.brokerDocSubmissions({
        status: docStatusFilter === "all" ? undefined : docStatusFilter,
        q: docSearch || undefined,
        page_size: 50
      }),
    enabled: isBrokerWorkspace || isSuperAdmin
  });
  const dealEventsQuery = useQuery({
    queryKey: ["admin-deal-events", expandedDealId],
    queryFn: () => api.dealEvents(expandedDealId as number),
    enabled: isBrokerWorkspace && expandedDealId !== null
  });

  const syncMutation = useMutation({
    mutationFn: api.syncSheets,
    onSuccess: () => {
      sourcesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Sheets synced" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Sync failed", description: errorMessage(err, "Could not sync sheets.") })
  });
  const retryLeadDeliveryMutation = useMutation({
    mutationFn: (leadId: number) => api.adminRetryLeadDelivery(leadId),
    onSuccess: () => {
      leadDeliveryQuery.refetch();
      toast({ variant: "success", title: "Lead retry queued" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Retry failed", description: errorMessage(err, "Could not queue lead retry.") })
  });

  const updateDealMutation = useMutation({
    mutationFn: (payload: { dealId: number; status: string }) => api.updateDeal(payload.dealId, { status: payload.status }),
    onSuccess: () => {
      dealsQuery.refetch();
      toast({ variant: "success", title: "Deal updated" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Deal update failed", description: errorMessage(err, "Could not update deal status.") })
  });

  const saveDealMetaMutation = useMutation({
    mutationFn: (payload: { dealId: number; assigned_broker_email?: string; delivery_scheduled_at?: string; delivery_address?: string }) =>
      api.updateDeal(payload.dealId, {
        assigned_broker_email: payload.assigned_broker_email,
        delivery_scheduled_at: payload.delivery_scheduled_at,
        delivery_address: payload.delivery_address
      }),
    onSuccess: () => {
      dealsQuery.refetch();
      toast({ variant: "success", title: "Deal details saved" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save deal details.") })
  });

  const createRateMutation = useMutation({
    mutationFn: () =>
      api.createLenderRate({
        lender_name: lenderName.trim(),
        credit_tier: creditTier.trim().toUpperCase(),
        vehicle_type: vehicleType.trim().toLowerCase(),
        apr: Number(apr),
        max_term_months: Number(maxTerm)
      }),
    onSuccess: () => {
      lenderRatesQuery.refetch();
      toast({ variant: "success", title: "Rate added" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Could not add rate", description: errorMessage(err, "Invalid rate payload.") })
  });
  const upsertOfferOverrideMutation = useMutation({
    mutationFn: (payload: {
      vin: string;
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }) =>
      api.upsertAdminOfferOverride(payload.vin, {
        down_payment: payload.down_payment,
        monthly_payment: payload.monthly_payment,
        discounted_price: payload.discounted_price,
        term_months: payload.term_months,
        miles_per_year: payload.miles_per_year
      }),
    onSuccess: () => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Lease special saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save lease special.") })
  });
  const upsertOfferOverrideByYmmMutation = useMutation({
    mutationFn: (payload: {
      year: number;
      make: string;
      model: string;
      vehicle_type?: "all" | "new" | "used";
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }) =>
      api.upsertAdminOfferOverrideByYmm(payload),
    onSuccess: (result) => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({
        variant: "success",
        title: "Lease specials saved",
        description: `${result.updated_count} vehicles updated for ${result.year} ${result.make} ${result.model}`
      });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save lease specials for Y/M/M.") })
  });
  const deleteOfferOverrideMutation = useMutation({
    mutationFn: (vin: string) => api.deleteAdminOfferOverride(vin),
    onSuccess: () => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Lease special removed" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not remove lease special.") })
  });
  const saveHomepageFeaturedMutation = useMutation({
    mutationFn: (vins: string[]) => api.setAdminHomepageFeatured({ month: featuredMonth, vins }),
    onSuccess: (result) => {
      setFeaturedDirty(false);
      setFeaturedVinsDraft(result.vins ?? []);
      homepageFeaturedQuery.refetch();
      toast({
        variant: "success",
        title: "Homepage featured cars saved",
        description: `${result.vins?.length ?? 0} vehicles selected for ${result.month}.`
      });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save homepage featured cars.") })
  });
  const upsertManualVehicleMutation = useMutation({
    mutationFn: (payload: ManualVehicleUpsertPayload & { vin: string; vehicle_type: "new" | "used" }) =>
      api.upsertAdminManualVehicle(payload.vin, {
        vehicle_type: payload.vehicle_type,
        year: payload.year,
        make: payload.make,
        model: payload.model,
        trim: payload.trim,
        msrp: payload.msrp,
        listed_price: payload.listed_price,
        mileage: payload.mileage,
        condition: payload.condition,
        dealer_name: payload.dealer_name,
        dealer_phone: payload.dealer_phone,
        listing_url: payload.listing_url,
        photos: payload.photos,
        down_payment: payload.down_payment,
        monthly_payment: payload.monthly_payment,
        discounted_price: payload.discounted_price
      }),
    onSuccess: () => {
      manualVehiclesQuery.refetch();
      homepageFeaturedQuery.refetch();
      toast({ variant: "success", title: "Manual vehicle saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save manual vehicle.") })
  });
  const uploadManualVehiclePhotoMutation = useMutation({
    mutationFn: (file: File) => api.uploadAdminManualVehiclePhoto(file),
    onSuccess: (result) => {
      const uploadedUrl = (result.url ?? "").trim();
      if (!uploadedUrl) {
        toast({ variant: "error", title: "Upload failed", description: "No image URL was returned." });
        return;
      }
      setManualPhotoUrls((prev) => {
        const next = [...prev];
        const emptyIndex = next.findIndex((value) => !value.trim());
        if (emptyIndex >= 0) {
          next[emptyIndex] = uploadedUrl;
        } else {
          next.push(uploadedUrl);
        }
        const cleaned = normalizePhotos(next);
        return cleaned.length > 0 ? cleaned : [""];
      });
      toast({ variant: "success", title: "Photo uploaded" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Upload failed", description: errorMessage(err, "Could not upload image.") })
  });
  const deleteManualVehicleMutation = useMutation({
    mutationFn: (vin: string) => api.deleteAdminManualVehicle(vin),
    onSuccess: () => {
      manualVehiclesQuery.refetch();
      homepageFeaturedQuery.refetch();
      toast({ variant: "success", title: "Manual vehicle deleted" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not delete manual vehicle.") })
  });
  const saveInventoryVinToManualMutation = useMutation({
    mutationFn: async ({ vin }: { vin: string }) => {
      const vehicle = await api.getVehicle(vin);
      const payload = toManualPayloadFromVehicle(vehicle);
      return api.upsertAdminManualVehicle(vin, payload);
    },
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not load VIN",
        description: errorMessage(err, "Could not save this VIN into Manual Vehicle Control.")
      })
  });
  const upsertSeoSettingMutation = useMutation({
    mutationFn: (payload: {
      pageKey: string;
      body: {
        title?: string | null;
        description?: string | null;
        keywords?: string | null;
        canonical_url?: string | null;
        og_title?: string | null;
        og_description?: string | null;
        og_image_url?: string | null;
        robots?: string | null;
        json_ld?: unknown;
        is_active?: boolean;
      };
    }) => api.upsertAdminSeoSetting(payload.pageKey, payload.body),
    onSuccess: () => {
      seoSettingsQuery.refetch();
      seoSettingQuery.refetch();
      toast({ variant: "success", title: "SEO setting saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save SEO setting.") })
  });
  const deleteSeoSettingMutation = useMutation({
    mutationFn: (pageKey: string) => api.deleteAdminSeoSetting(pageKey),
    onSuccess: () => {
      seoSettingsQuery.refetch();
      seoSettingQuery.refetch();
      toast({ variant: "success", title: "SEO setting deleted" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not delete SEO setting.") })
  });

  const sendBrokerReplyMutation = useMutation({
    mutationFn: (payload: { customer_user_id: number; vin?: string; message: string }) => api.sendBrokerReply(payload),
    onSuccess: (_data, variables) => {
      const key = `${variables.customer_user_id}|${variables.vin ?? ""}`;
      setBrokerReplyByThread((prev) => ({ ...prev, [key]: "" }));
      messagesQuery.refetch();
      toast({ variant: "success", title: "Reply sent" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Reply failed", description: errorMessage(err, "Could not send reply.") })
  });

  const updateCreditApplicationMutation = useMutation({
    mutationFn: (payload: { id: number; status?: string; broker_note?: string }) =>
      api.updateBrokerCreditApplication(payload.id, { status: payload.status, broker_note: payload.broker_note }),
    onSuccess: () => {
      creditApplicationsQuery.refetch();
      toast({ variant: "success", title: "Credit application updated" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Update failed", description: errorMessage(err, "Could not update credit application.") })
  });

  const updateDocSubmissionMutation = useMutation({
    mutationFn: (payload: { id: number; status?: string; broker_note?: string }) =>
      api.updateBrokerDocSubmission(payload.id, { status: payload.status, broker_note: payload.broker_note }),
    onSuccess: () => {
      docSubmissionsQuery.refetch();
      toast({ variant: "success", title: "Document submission updated" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Update failed", description: errorMessage(err, "Could not update document submission.") })
  });

  const deals = dealsQuery.data?.items ?? [];
  const offerOverrides = offerOverridesQuery.data?.items ?? [];
  const homepageFeaturedItems = homepageFeaturedQuery.data?.items ?? [];
  const homepageFeaturedLimit = homepageFeaturedQuery.data?.max_items ?? 6;
  const manualVehicles: ManualVehicleRecord[] = manualVehiclesQuery.data?.items ?? [];
  const seoSettings: SeoPageSettingRecord[] = seoSettingsQuery.data?.items ?? [];
  const seoSettingErrorStatus = (seoSettingQuery.error as { status?: number } | null)?.status;
  const leadDeliveryItems: LeadDeliveryRecord[] = leadDeliveryQuery.data?.items ?? [];
  const generalStatus = generalStatusQuery.data;
  const featuredSummaryByVin = useMemo(() => {
    const map: Record<string, (typeof homepageFeaturedItems)[number]["vehicle"]> = {};
    for (const item of homepageFeaturedItems) {
      if (!item.vin) continue;
      map[item.vin] = item.vehicle;
    }
    return map;
  }, [homepageFeaturedItems]);
  const offerOverrideByVin = useMemo(() => {
    const map: Record<string, (typeof offerOverrides)[number]> = {};
    for (const item of offerOverrides) {
      if (!item.vin) continue;
      map[item.vin] = item;
    }
    return map;
  }, [offerOverrides]);
  const creditApplications = creditApplicationsQuery.data?.items ?? [];
  const docSubmissions = docSubmissionsQuery.data?.items ?? [];
  const latestDocByDealKey = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of docSubmissions) {
      const key = `${row.user_id}|${row.vin ?? ""}`;
      const current = map[key];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[key] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [docSubmissions]);
  const latestDocByVin = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of docSubmissions) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [docSubmissions]);
  const latestCreditByDealKey = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of creditApplications) {
      if (!row.user_id) continue;
      const key = `${row.user_id}|${row.vin ?? ""}`;
      const current = map[key];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[key] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [creditApplications]);
  const latestCreditByVin = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of creditApplications) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [creditApplications]);
  const pendingCreditCount = creditApplications.filter((item) => (item.status ?? "submitted") === "submitted").length;
  const pendingDocCount = docSubmissions.filter((item) => (item.status ?? "submitted") === "submitted").length;
  const totalDeals = deals.length;
  const activeDeals = deals.filter((deal) => !["delivered", "cancelled"].includes(deal.status)).length;
  const unassignedDeals = deals.filter((deal) => !deal.assigned_broker_email && !["delivered", "cancelled"].includes(deal.status)).length;
  const deliveryQueueDeals = deals.filter((deal) => ["locked", "docs_pending"].includes(deal.status)).length;

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

  const threads = useMemo(() => {
    const items = messagesQuery.data?.items ?? [];
    const grouped = new Map<string, { key: string; userId: string; vin?: string; customerName?: string | null; customerEmail?: string | null; items: typeof items }>();
    for (const m of items) {
      if (!m.userId) continue;
      const key = `${m.userId}|${m.vin ?? ""}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.items.push(m);
      } else {
        grouped.set(key, {
          key,
          userId: m.userId,
          vin: m.vin,
          customerName: m.customerName,
          customerEmail: m.customerEmail,
          items: [m]
        });
      }
    }
    const list = Array.from(grouped.values()).map((t) => ({
      ...t,
      items: [...t.items].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
    }));
    const enriched = list.map((thread) => {
      const lastMessage = thread.items[thread.items.length - 1];
      const lastAt = lastMessage?.createdAt ?? "";
      const lastSenderType = (lastMessage?.senderType ?? "").toLowerCase();
      const customerMessageCount = thread.items.filter((m) => (m.senderType ?? "").toLowerCase() !== "broker").length;
      const brokerMessageCount = thread.items.filter((m) => (m.senderType ?? "").toLowerCase() === "broker").length;
      const needsReply = thread.items.length > 0 && lastSenderType !== "broker";

      return {
        ...thread,
        lastAt,
        lastSenderType,
        needsReply,
        customerMessageCount,
        brokerMessageCount
      };
    });
    enriched.sort((a, b) => {
      if (a.needsReply && !b.needsReply) return -1;
      if (!a.needsReply && b.needsReply) return 1;
      return b.lastAt.localeCompare(a.lastAt);
    });
    return enriched;
  }, [messagesQuery.data?.items]);

  const vehicleVins = useMemo(() => {
    const set = new Set<string>();
    for (const deal of deals) {
      if (deal.vin) set.add(deal.vin);
    }
    for (const thread of threads) {
      if (thread.vin) set.add(thread.vin);
    }
    for (const vin of featuredVinsDraft) {
      if (vin) set.add(vin);
    }
    for (const item of homepageFeaturedItems) {
      if (item.vin) set.add(item.vin);
    }
    return Array.from(set).sort();
  }, [deals, threads, featuredVinsDraft, homepageFeaturedItems]);

  const vehiclesByVinQuery = useQuery({
    queryKey: ["admin-vehicles-by-vin", vehicleVins.join("|")],
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

  const replyNeededCount = threads.filter((thread) => thread.needsReply).length;

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

  const scrollMessagesToBottom = () => {
    if (!messageScrollRef.current) return;
    messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
  };

  useEffect(() => {
    if (featuredDirty) return;
    setFeaturedVinsDraft(homepageFeaturedQuery.data?.vins ?? []);
  }, [homepageFeaturedQuery.data?.month, homepageFeaturedQuery.data?.vins, featuredDirty]);

  useLayoutEffect(() => {
    scrollMessagesToBottom();
    const frame = requestAnimationFrame(scrollMessagesToBottom);
    return () => cancelAnimationFrame(frame);
  }, [activeThread?.key, activeThread?.lastAt, messagesQuery.data?.items?.length, sendBrokerReplyMutation.isSuccess]);

  useEffect(() => {
    if (!highlightedDealId) return;
    const timeout = setTimeout(() => setHighlightedDealId(null), 3000);
    return () => clearTimeout(timeout);
  }, [highlightedDealId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!isValidSeoPageKey || !normalizedSeoPageKey) return;

    const row = seoSettingQuery.data;
    if (row && row.page_key === normalizedSeoPageKey) {
      setSeoTitle(row.title ?? "");
      setSeoDescription(row.description ?? "");
      setSeoKeywords(row.keywords ?? "");
      setSeoCanonicalUrl(row.canonical_url ?? "");
      setSeoOgTitle(row.og_title ?? "");
      setSeoOgDescription(row.og_description ?? "");
      setSeoOgImageUrl(row.og_image_url ?? "");
      setSeoRobots(row.robots ?? "index,follow");
      setSeoJsonLd(prettyJson(row.json_ld ?? {}));
      setSeoIsActive(row.is_active !== false);
      return;
    }

    const err = seoSettingQuery.error as { status?: number } | null;
    if (err?.status === 404) {
      setSeoTitle("");
      setSeoDescription("");
      setSeoKeywords("");
      setSeoCanonicalUrl("");
      setSeoOgTitle("");
      setSeoOgDescription("");
      setSeoOgImageUrl("");
      setSeoRobots("index,follow");
      setSeoJsonLd("{}");
      setSeoIsActive(true);
    }
  }, [isSuperAdmin, isValidSeoPageKey, normalizedSeoPageKey, seoSettingQuery.data, seoSettingQuery.error]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (adminTab === "broker_ops") {
      setAdminTab("admin_data");
    }
  }, [isSuperAdmin, adminTab]);

  const confirmAction = (title: string, onConfirm: () => void, description = "Please confirm this broker action.") => {
    setConfirmState({
      open: true,
      title,
      description,
      onConfirm
    });
  };

  const selectedStatusIndex = Math.max(0, PIPELINE_STEPS.findIndex((step) => step.key === statusFilter));
  const pipelineCounts = PIPELINE_STEPS.map((step) => deals.filter((deal) => deal.status === step.key).length);
  const filteredStatusCount = statusFilter === "all" ? totalDeals : deals.filter((deal) => deal.status === statusFilter).length;

  const focusConversationForDeal = (deal: Deal) => {
    const exactKey = `${deal.user_id}|${deal.vin ?? ""}`;
    const userPrefix = `${deal.user_id}|`;
    const exact = threads.find((thread) => thread.key === exactKey);
    const fallback = threads.find((thread) => thread.key.startsWith(userPrefix));
    const target = exact ?? fallback;
    if (target) {
      setSelectedThreadKey(target.key);
    }
    setTimeout(() => {
      conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const focusDealInPipeline = (deal: Deal) => {
    setStatusFilter("all");
    setDealSearch(deal.vin);
    setHighlightedDealId(deal.id);
    setTimeout(() => {
      const target = document.getElementById(`deal-card-${deal.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        dealPipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
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

  const openDocsQueueForVin = (vin: string) => {
    setAdminTab("credit_docs");
    setDocSearch(vin);
    setTimeout(() => {
      docsQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };
  const openCreditQueueForVin = (vin: string) => {
    setAdminTab("credit_docs");
    setCreditSearch(vin);
    setTimeout(() => {
      docsQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const requestDocsForDeal = (deal: Deal) => {
    confirmAction(
      `Send a document request to customer for VIN ${deal.vin}?`,
      () =>
        sendBrokerReplyMutation.mutate({
          customer_user_id: deal.user_id,
          vin: deal.vin,
          message: `Please upload your required documents for VIN ${deal.vin} (driver license and insurance) so we can continue your deal.`
        }),
      "This sends a broker message to the customer."
    );
  };
  const requestCreditForDeal = (deal: Deal) => {
    confirmAction(
      `Send a credit application request to customer for VIN ${deal.vin}?`,
      () =>
        sendBrokerReplyMutation.mutate({
          customer_user_id: deal.user_id,
          vin: deal.vin,
          message: `Please complete your credit application for VIN ${deal.vin}. Use the Credit Application form so we can continue your deal.`
        }),
      "This sends a broker message to the customer."
    );
  };

  const setDocStatusForDeal = (submissionId: number, status: string) => {
    confirmAction(
      `Set document status to ${status.replaceAll("_", " ")}?`,
      () => updateDocSubmissionMutation.mutate({ id: submissionId, status }),
      "This updates document verification status in broker and customer views."
    );
  };
  const setCreditStatusForDeal = (applicationId: number, status: string) => {
    confirmAction(
      `Set credit status to ${status.replaceAll("_", " ")}?`,
      () => updateCreditApplicationMutation.mutate({ id: applicationId, status }),
      "This updates credit review status in broker and customer views."
    );
  };

  const toggleLeaseSpecialForDeal = (deal: Deal, vehicle?: Vehicle) => {
    const existing = offerOverrideByVin[deal.vin];
    if (existing?.source && existing.source !== "broker") {
      toast({
        variant: "success",
        title: `Already in Lease Specials (${existing.source})`
      });
      return;
    }
    if (existing?.source === "broker") {
      confirmAction(
        `Remove VIN ${deal.vin} from Lease Specials?`,
        () => deleteOfferOverrideMutation.mutate(deal.vin),
        "This removes your broker override special."
      );
      return;
    }

    confirmAction(
      `Add VIN ${deal.vin} to Lease Specials?`,
      () =>
        upsertOfferOverrideMutation.mutate({
          vin: deal.vin,
          down_payment: vehicle?.down ?? null,
          monthly_payment: vehicle?.monthly ?? null,
          discounted_price: vehicle?.discounted ?? vehicle?.listed_price ?? vehicle?.msrp ?? null,
          term_months: vehicle?.term_months ?? null,
          miles_per_year: vehicle?.miles_per_year ?? null
        }),
      "This creates a broker lease special override for this VIN."
    );
  };

  const scrollToManualVehicleControl = () => {
    setAdminTab("admin_data");
    setTimeout(() => {
      manualVehicleControlRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const addVinToFeaturedDraft = (vin: string): "added" | "already" | "full" => {
    const normalizedVin = vin.trim().toUpperCase();
    if (!normalizedVin) return "already";
    if (featuredVinsDraft.includes(normalizedVin)) return "already";
    if (featuredVinsDraft.length >= homepageFeaturedLimit) return "full";
    setFeaturedVinsDraft((prev) => [...prev, normalizedVin]);
    setFeaturedDirty(true);
    return "added";
  };

  const addHomepageFeaturedVin = () => {
    const vin = featuredVinInput.trim().toUpperCase();
    if (!vin) return;
    if (vin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }
    const result = addVinToFeaturedDraft(vin);
    if (result === "already") {
      toast({ variant: "error", title: "Already selected", description: `${vin} is already in the featured list.` });
      return;
    }
    if (result === "full") {
      toast({
        variant: "error",
        title: "List full",
        description: `You can select up to ${homepageFeaturedLimit} homepage featured cars.`
      });
      return;
    }
    setFeaturedVinInput("");
  };

  const removeHomepageFeaturedVin = (vin: string) => {
    setFeaturedVinsDraft((prev) => prev.filter((item) => item !== vin));
    setFeaturedDirty(true);
  };

  const moveHomepageFeaturedVin = (vin: string, direction: "up" | "down") => {
    setFeaturedVinsDraft((prev) => {
      const index = prev.indexOf(vin);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setFeaturedDirty(true);
  };

  const openManualVehicleEditorForVin = (vin: string, options?: { addToFeatured?: boolean }) => {
    const normalizedVin = vin.trim().toUpperCase();
    if (normalizedVin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }

    const existing = manualVehicles.find((item) => (item.vin ?? "").trim().toUpperCase() === normalizedVin);
    if (existing) {
      populateManualVehicleForm(existing);
      if (options?.addToFeatured) {
        const featuredResult = addVinToFeaturedDraft(normalizedVin);
        if (featuredResult === "full") {
          toast({
            variant: "error",
            title: "Featured list full",
            description: `Manual record loaded. You can select up to ${homepageFeaturedLimit} featured vehicles.`
          });
        }
      }
      setFeaturedVinInput("");
      scrollToManualVehicleControl();
      toast({
        variant: "success",
        title: "Manual vehicle ready",
        description: `VIN ${normalizedVin} is loaded in Manual Vehicle Control for photo and pricing edits.`
      });
      return;
    }

    saveInventoryVinToManualMutation.mutate(
      { vin: normalizedVin },
      {
        onSuccess: (result) => {
          manualVehiclesQuery.refetch();
          homepageFeaturedQuery.refetch();
          populateManualVehicleForm(result.item);

          if (options?.addToFeatured) {
            const featuredResult = addVinToFeaturedDraft(normalizedVin);
            if (featuredResult === "full") {
              toast({
                variant: "error",
                title: "Featured list full",
                description: `Manual record saved. You can select up to ${homepageFeaturedLimit} featured vehicles.`
              });
            }
          }

          setFeaturedVinInput("");
          scrollToManualVehicleControl();
          toast({
            variant: "success",
            title: "Saved to Manual Vehicle Control",
            description: `VIN ${normalizedVin} is now editable (photos, pricing, details) for your homepage specials.`
          });
        }
      }
    );
  };

  const saveFeaturedVinToManualAndFeatured = () => {
    const vin = featuredVinInput.trim().toUpperCase();
    if (!vin) return;
    confirmAction(
      `Save VIN ${vin} to Manual Vehicle Control and add it to homepage featured?`,
      () => openManualVehicleEditorForVin(vin, { addToFeatured: true }),
      "This creates/updates a manual record so you can edit photos and pricing, and adds the VIN to the featured draft list."
    );
  };

  const saveHomepageFeatured = () => {
    const cleaned = featuredVinsDraft
      .map((vin) => vin.trim().toUpperCase())
      .filter((vin, idx, arr) => vin.length >= 8 && arr.indexOf(vin) === idx)
      .slice(0, homepageFeaturedLimit);
    saveHomepageFeaturedMutation.mutate(cleaned);
  };

  const resetManualVehicleForm = () => {
    setManualVin("");
    setManualYear("");
    setManualMake("");
    setManualModel("");
    setManualTrim("");
    setManualVehicleType("new");
    setManualListedPrice("");
    setManualMsrp("");
    setManualMileage("");
    setManualCondition("");
    setManualDealerName("");
    setManualDealerPhone("");
    setManualListingUrl("");
    setManualPhotoUrls([""]);
    setManualDownPayment("");
    setManualMonthlyPayment("");
    setManualDiscountedPrice("");
  };

  const populateManualVehicleForm = (item: ManualVehicleRecord) => {
    setManualVin((item.vin ?? "").toUpperCase());
    setManualYear(item.year != null ? String(item.year) : "");
    setManualMake(item.make ?? "");
    setManualModel(item.model ?? "");
    setManualTrim(item.trim ?? "");
    setManualVehicleType((item.vehicle_type ?? "new").toLowerCase() === "used" ? "used" : "new");
    setManualListedPrice(item.listed_price != null ? String(item.listed_price) : "");
    setManualMsrp(item.msrp != null ? String(item.msrp) : "");
    setManualMileage(item.mileage != null ? String(item.mileage) : "");
    setManualCondition(item.condition ?? "");
    setManualDealerName(item.dealer_name ?? "");
    setManualDealerPhone(item.dealer_phone ?? "");
    setManualListingUrl(item.listing_url ?? "");
    const nextPhotos = normalizePhotos(Array.isArray(item.photos) ? item.photos : []);
    setManualPhotoUrls(nextPhotos.length > 0 ? nextPhotos : [""]);
    setManualDownPayment(item.down_payment != null ? String(item.down_payment) : "");
    setManualMonthlyPayment(item.monthly_payment != null ? String(item.monthly_payment) : "");
    setManualDiscountedPrice(item.discounted_price != null ? String(item.discounted_price) : "");
  };

  const saveManualVehicle = () => {
    const vin = manualVin.trim().toUpperCase();
    if (vin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }
    const cleanPhotoUrls = normalizePhotos(manualPhotoUrls);
    upsertManualVehicleMutation.mutate({
      vin,
      vehicle_type: manualVehicleType,
      year: manualYear.trim() ? Number(manualYear) : null,
      make: manualMake.trim() || null,
      model: manualModel.trim() || null,
      trim: manualTrim.trim() || null,
      listed_price: manualListedPrice.trim() ? Number(manualListedPrice) : null,
      msrp: manualMsrp.trim() ? Number(manualMsrp) : null,
      mileage: manualMileage.trim() ? Number(manualMileage) : null,
      condition: manualCondition.trim() || null,
      dealer_name: manualDealerName.trim() || null,
      dealer_phone: manualDealerPhone.trim() || null,
      listing_url: manualListingUrl.trim() || null,
      photos: cleanPhotoUrls,
      down_payment: manualDownPayment.trim() ? Number(manualDownPayment) : null,
      monthly_payment: manualMonthlyPayment.trim() ? Number(manualMonthlyPayment) : null,
      discounted_price: manualDiscountedPrice.trim() ? Number(manualDiscountedPrice) : null
    });
  };

  const addManualPhotoInput = () => {
    setManualPhotoUrls((prev) => [...prev, ""]);
  };

  const onManualPhotoFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    uploadManualVehiclePhotoMutation.mutate(file);
  };

  const updateManualPhotoInput = (index: number, value: string) => {
    setManualPhotoUrls((prev) => prev.map((photoUrl, idx) => (idx === index ? value : photoUrl)));
  };

  const removeManualPhotoInput = (index: number) => {
    setManualPhotoUrls((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const makeManualPhotoPrimary = (index: number) => {
    if (index <= 0) return;
    setManualPhotoUrls((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  };

  const clearSeoForm = () => {
    setSeoTitle("");
    setSeoDescription("");
    setSeoKeywords("");
    setSeoCanonicalUrl("");
    setSeoOgTitle("");
    setSeoOgDescription("");
    setSeoOgImageUrl("");
    setSeoRobots("index,follow");
    setSeoJsonLd("{}");
    setSeoIsActive(true);
  };

  const saveSeoSetting = () => {
    if (!isValidSeoPageKey) {
      toast({
        variant: "error",
        title: "Invalid page key",
        description: "Use lowercase letters/numbers and optional _ or -."
      });
      return;
    }

    let parsedJsonLd: unknown = null;
    const rawJsonLd = seoJsonLd.trim();
    if (rawJsonLd) {
      try {
        parsedJsonLd = JSON.parse(rawJsonLd);
      } catch {
        toast({
          variant: "error",
          title: "Invalid JSON-LD",
          description: "Please enter valid JSON for structured data."
        });
        return;
      }
    }

    const clean = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    upsertSeoSettingMutation.mutate({
      pageKey: normalizedSeoPageKey,
      body: {
        title: clean(seoTitle),
        description: clean(seoDescription),
        keywords: clean(seoKeywords),
        canonical_url: clean(seoCanonicalUrl),
        og_title: clean(seoOgTitle),
        og_description: clean(seoOgDescription),
        og_image_url: clean(seoOgImageUrl),
        robots: clean(seoRobots),
        json_ld: parsedJsonLd,
        is_active: seoIsActive
      }
    });
  };

  const viewDoc = async (submissionId: number, kind: "drivers_license" | "insurance") => {
    try {
      const { blob, filename } = await api.brokerDocDownload(submissionId, kind);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast({ variant: "error", title: "Preview failed", description: errorMessage(err, "Could not open document preview.") });
    }
  };

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="market-kicker">Admin Console</p>
              <h1 className="market-heading text-3xl sm:text-4xl">
                {isSuperAdmin ? "Super Admin Workspace" : "Broker Workspace"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin ? (
                <Badge>Super admin controls</Badge>
              ) : (
                <>
                  <Badge>{totalDeals} deals</Badge>
                  <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                    Sync Sheets
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <Tabs value={adminTab} onValueChange={(value) => setAdminTab(value as "broker_ops" | "credit_docs" | "admin_data")} className="space-y-4">
          <TabsList className="bg-ink-100 p-1">
            {!isSuperAdmin && <TabsTrigger value="broker_ops">Broker Operations</TabsTrigger>}
            <TabsTrigger value="credit_docs">
              {isSuperAdmin ? "Forms & Results" : "Credit & Docs"}
              {(pendingCreditCount > 0 || pendingDocCount > 0) && (
                <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                  {pendingCreditCount + pendingDocCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="admin_data">{isSuperAdmin ? "Super Admin" : "Admin Data"}</TabsTrigger>
          </TabsList>

          {!isSuperAdmin && (
          <TabsContent value="broker_ops" className="space-y-6">
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

            <div className="flex flex-wrap gap-2">
              <Input
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
                placeholder="Search by VIN, deal ID, customer name, or email"
                className="max-w-xl"
              />
              {(dealSearch || statusFilter !== "all") && (
                <Button variant="outline" onClick={() => { setDealSearch(""); setStatusFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </div>

            {filteredDeals.length === 0 && (
              <p className="text-sm text-ink-600">No deals match current filters.</p>
            )}

            <div className="space-y-4">
              {filteredDeals.slice(0, 80).map((deal) => (
                <DealCard
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
          </CardContent>
        </Card>
        </section>

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
              <Badge className="bg-red-50 text-red-700">
                {replyNeededCount} need reply
              </Badge>
              <span>Priority inbox sorted by pending customer response</span>
            </div>
            <Input
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search by customer, email, VIN, or user ID"
              className="max-w-xl"
            />
            {threads.length === 0 && (
              <p className="text-sm text-ink-600">No shopper messages yet.</p>
            )}
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
                          {thread.needsReply && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Needs reply" />}
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
                            <Badge className="bg-red-50 text-red-700">
                              Awaiting broker reply
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700">
                              Response sent
                            </Badge>
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
                              <img src={activeThreadVehicle.photo} alt={vehicleTitle(activeThreadVehicle, activeThread.vin)} className="h-full w-full object-cover" />
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
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!activeThreadDeal}
                          onClick={() => activeThreadDeal && focusDealInPipeline(activeThreadDeal)}
                        >
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
                          <Badge className="border border-ink-200 bg-ink-50 text-ink-700">
                            Last docs {formatDateTime(activeThreadDocStatus.created_at)}
                          </Badge>
                        )}
                        {activeThreadCreditStatus?.created_at && (
                          <Badge className="border border-ink-200 bg-ink-50 text-ink-700">
                            Last credit {formatDateTime(activeThreadCreditStatus.created_at)}
                          </Badge>
                        )}
                      </div>

                      {activeThreadDeal && (
                        <div className="mb-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Document Check</p>
                              <Badge className="border border-ink-200 bg-white text-ink-700">
                                {(activeThreadDocStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => requestDocsForDeal(activeThreadDeal)}>
                                Request docs
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openDocsQueueForVin(activeThreadDeal.vin)}>
                                Open docs queue
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
                              <Badge className="border border-ink-200 bg-white text-ink-700">
                                {(activeThreadCreditStatus?.status ?? "not_submitted").toString().replaceAll("_", " ")}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => requestCreditForDeal(activeThreadDeal)}>
                                Request credit app
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openCreditQueueForVin(activeThreadDeal.vin)}>
                                Open credit queue
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
                          <Button
                            disabled={sendBrokerReplyMutation.isPending || !activeThreadDraft.trim()}
                            onClick={sendReplyForActiveThread}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Send reply
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  {!activeThread && (
                    <p className="text-sm text-ink-600">Select a thread to review and respond.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </section>
          </TabsContent>
          )}

          <TabsContent value="credit_docs" className="space-y-6">
            <div ref={docsQueueRef}>
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
                    {["all", "submitted", "in_review", "approved", "declined"].map((status) => (
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
                <div className="space-y-3">
                  {creditApplications.map((item) => (
                    <div key={item.id} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          App #{item.id} | {item.customer_name ?? item.customer_email ?? "Customer"} | VIN {item.vin ?? "-"}
                        </p>
                        <Badge>{item.status ?? "submitted"}</Badge>
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
                      {isSuperAdmin && (
                        <div className="mt-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-ink-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                              Review Owner
                            </p>
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
                      {!isSuperAdmin && (
                        <>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {["in_review", "approved", "declined"].map((next) => (
                              <Button
                                key={next}
                                size="sm"
                                variant="outline"
                                disabled={updateCreditApplicationMutation.isPending}
                                onClick={() => {
                                  confirmAction(
                                    `Set credit application #${item.id} to ${next.replaceAll("_", " ")}?`,
                                    () => updateCreditApplicationMutation.mutate({ id: item.id, status: next }),
                                    "This updates credit status for both broker and customer."
                                  );
                                }}
                              >
                                {(() => {
                                  const Icon = creditActionIcon(next);
                                  return <Icon className="h-3.5 w-3.5" />;
                                })()}
                                Set {next.replaceAll("_", " ")}
                              </Button>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Input
                              value={creditNotes[item.id] ?? item.broker_note ?? ""}
                              onChange={(e) => setCreditNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Broker note"
                              className="max-w-xl"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateCreditApplicationMutation.isPending}
                              onClick={() => {
                                confirmAction(
                                  `Save broker note for credit application #${item.id}?`,
                                  () =>
                                    updateCreditApplicationMutation.mutate({
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
                        </>
                      )}
                      <details className="mt-2 rounded border border-ink-200 bg-white p-2">
                        <summary className="cursor-pointer text-xs font-medium text-ink-700">View application payload</summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-ink-700">{prettyJson(item.payload_json)}</pre>
                      </details>
                    </div>
                  ))}
                  {creditApplications.length === 0 && <p className="text-sm text-ink-600">No credit applications found.</p>}
                </div>
              </CardContent>
            </Card>
            </div>

            <Card className="border-ink-200 bg-white">
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
                    {["all", "submitted", "in_review", "approved", "rejected"].map((status) => (
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
                <div className="space-y-3">
                  {docSubmissions.map((item) => (
                    <div key={item.id} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          Docs #{item.id} | {item.customer_name ?? item.customer_email ?? "Customer"} | VIN {item.vin ?? "-"}
                        </p>
                        <Badge>{item.status ?? "submitted"}</Badge>
                      </div>
                      <p className="text-xs text-ink-600">
                        Submitted: {formatDateTime(item.created_at)} | Contact: {item.customer_email ?? "-"}
                      </p>
                      {isSuperAdmin && (
                        <div className="mt-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-ink-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                              Review Owner
                            </p>
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
                          <div className="mt-2 flex flex-wrap gap-2">
                            {["in_review", "approved", "rejected"].map((next) => (
                              <Button
                                key={next}
                                size="sm"
                                variant="outline"
                                disabled={updateDocSubmissionMutation.isPending}
                                onClick={() => {
                                  confirmAction(
                                    `Set document submission #${item.id} to ${next.replaceAll("_", " ")}?`,
                                    () => updateDocSubmissionMutation.mutate({ id: item.id, status: next }),
                                    "This updates document status for both broker and customer."
                                  );
                                }}
                              >
                                Set {next.replaceAll("_", " ")}
                              </Button>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Input
                              value={docNotes[item.id] ?? item.broker_note ?? ""}
                              onChange={(e) => setDocNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Broker note"
                              className="max-w-xl"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateDocSubmissionMutation.isPending}
                              onClick={() => {
                                confirmAction(
                                  `Save broker note for document submission #${item.id}?`,
                                  () =>
                                    updateDocSubmissionMutation.mutate({
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
                        </>
                      )}
                    </div>
                  ))}
                  {docSubmissions.length === 0 && <p className="text-sm text-ink-600">No document submissions found.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin_data" className="space-y-6">
        {isSuperAdmin && (
        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-600" />
              General Feed Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-600">
              Super Admin overview of active feed dealers and active inventory counts. More status functions can be added here later.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => generalStatusQuery.refetch()} disabled={generalStatusQuery.isFetching}>
                Refresh
              </Button>
              {generalStatus?.generated_at && <Badge>Updated {formatDateTime(generalStatus.generated_at)}</Badge>}
            </div>

            {generalStatusQuery.isLoading && <p className="text-sm text-ink-600">Loading general status...</p>}
            {generalStatusQuery.isError && (
              <p className="text-sm text-red-700">Could not load general status. Please refresh.</p>
            )}

            {!generalStatusQuery.isLoading && !generalStatusQuery.isError && generalStatus && (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Active dealers</p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.dealers.active_count}</p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Active new cars</p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_new_count}</p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Active used cars</p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_used_count}</p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Active total cars</p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_total_count}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Active dealer names</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {generalStatus.dealers.names.map((name) => (
                      <Badge key={name} className="border-ink-300 bg-white text-ink-700">
                        {name}
                      </Badge>
                    ))}
                    {generalStatus.dealers.names.length === 0 && (
                      <p className="text-sm text-ink-600">No active dealers found in feed.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {isSuperAdmin && (
        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-600" />
              Homepage Featured Cars (6 slots)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-600">
              Pick and order the vehicles shown on the landing page. Set a month, save up to {homepageFeaturedLimit} VINs, and use
              "Save VIN + Edit Photos" for static/manual specials you can fine-tune.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="month"
                value={featuredMonth}
                onChange={(e) => {
                  setFeaturedMonth(e.target.value || currentMonthKey());
                  setFeaturedDirty(false);
                }}
                className="max-w-[180px]"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={homepageFeaturedQuery.isFetching}
                onClick={() => {
                  setFeaturedDirty(false);
                  homepageFeaturedQuery.refetch();
                }}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                disabled={saveHomepageFeaturedMutation.isPending || !featuredDirty}
                onClick={() =>
                  confirmAction(
                    `Save featured homepage vehicles for ${featuredMonth}?`,
                    saveHomepageFeatured,
                    "This updates the landing page featured cars for the selected month."
                  )
                }
              >
                Save Featured Cars
              </Button>
              <Badge>{featuredVinsDraft.length}/{homepageFeaturedLimit}</Badge>
              {featuredDirty && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Unsaved</Badge>}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <Input
                value={featuredVinInput}
                onChange={(e) => setFeaturedVinInput(e.target.value.toUpperCase())}
                placeholder="Add VIN"
              />
              <Button size="sm" onClick={addHomepageFeaturedVin} disabled={!featuredVinInput.trim()}>
                Add VIN
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!featuredVinInput.trim() || saveInventoryVinToManualMutation.isPending}
                onClick={saveFeaturedVinToManualAndFeatured}
              >
                Save VIN + Edit Photos
              </Button>
            </div>

            <div className="space-y-2">
              {featuredVinsDraft.map((vin, index) => {
                const vehicle = vehiclesByVin[vin];
                const summary = featuredSummaryByVin[vin];
                const title =
                  vehicleTitle(vehicle, vin) !== `VIN ${vin}`
                    ? vehicleTitle(vehicle, vin)
                    : [summary?.year, summary?.make, summary?.model, summary?.trim].filter(Boolean).join(" ") || `VIN ${vin}`;
                const monthly = vehicle?.monthly ?? summary?.monthly_payment;
                return (
                  <div key={vin} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        #{index + 1} {title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saveInventoryVinToManualMutation.isPending}
                          onClick={() => openManualVehicleEditorForVin(vin)}
                        >
                          Edit Photos
                        </Button>
                        <Button size="sm" variant="outline" disabled={index === 0} onClick={() => moveHomepageFeaturedVin(vin, "up")}>
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={index === featuredVinsDraft.length - 1}
                          onClick={() => moveHomepageFeaturedVin(vin, "down")}
                        >
                          Down
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => removeHomepageFeaturedVin(vin)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-ink-600">
                      VIN {vin}
                      {typeof monthly === "number" ? ` | ${formatCurrency(monthly)}/mo` : ""}
                    </p>
                  </div>
                );
              })}
              {featuredVinsDraft.length === 0 && (
                <p className="text-sm text-ink-600">No featured cars selected for {featuredMonth}.</p>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {isSuperAdmin && (
        <Card ref={manualVehicleControlRef} className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-600" />
              Manual Vehicle Control (Super Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-600">
              Save VINs here to create editable static specials, then control the homepage featured 6 list.
            </p>
            <div className="grid gap-2 md:grid-cols-6">
              <Input value={manualVin} onChange={(e) => setManualVin(e.target.value.toUpperCase())} placeholder="VIN*" />
              <Input value={manualYear} onChange={(e) => setManualYear(e.target.value)} placeholder="Year" />
              <Input value={manualMake} onChange={(e) => setManualMake(e.target.value)} placeholder="Make" />
              <Input value={manualModel} onChange={(e) => setManualModel(e.target.value)} placeholder="Model" />
              <Input value={manualTrim} onChange={(e) => setManualTrim(e.target.value)} placeholder="Trim" />
              <div className="flex gap-2">
                <Button size="sm" variant={manualVehicleType === "new" ? "default" : "outline"} onClick={() => setManualVehicleType("new")}>
                  New
                </Button>
                <Button size="sm" variant={manualVehicleType === "used" ? "default" : "outline"} onClick={() => setManualVehicleType("used")}>
                  Used
                </Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              <Input value={manualListedPrice} onChange={(e) => setManualListedPrice(e.target.value)} placeholder="Listed price" />
              <Input value={manualMsrp} onChange={(e) => setManualMsrp(e.target.value)} placeholder="MSRP" />
              <Input value={manualMileage} onChange={(e) => setManualMileage(e.target.value)} placeholder="Mileage" />
              <Input value={manualCondition} onChange={(e) => setManualCondition(e.target.value)} placeholder="Condition (new/used/cpo)" />
              <Input value={manualDealerName} onChange={(e) => setManualDealerName(e.target.value)} placeholder="Dealer name" />
              <Input value={manualDealerPhone} onChange={(e) => setManualDealerPhone(e.target.value)} placeholder="Dealer phone" />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input value={manualListingUrl} onChange={(e) => setManualListingUrl(e.target.value)} placeholder="Listing URL" />
              <Input value={manualDownPayment} onChange={(e) => setManualDownPayment(e.target.value)} placeholder="Down payment" />
              <Input value={manualMonthlyPayment} onChange={(e) => setManualMonthlyPayment(e.target.value)} placeholder="Monthly payment" />
            </div>
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink-900">Photos</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" type="button" onClick={addManualPhotoInput}>
                    Add Photo
                  </Button>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium ${
                      uploadManualVehiclePhotoMutation.isPending
                        ? "cursor-not-allowed border-ink-200 bg-ink-100 text-ink-400"
                        : "border-ink-300 bg-white text-ink-800 hover:bg-ink-100"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadManualVehiclePhotoMutation.isPending}
                      onChange={onManualPhotoFileSelected}
                    />
                    <Upload className="h-3.5 w-3.5" />
                    {uploadManualVehiclePhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
                  </label>
                </div>
              </div>
              <p className="mb-2 text-xs text-ink-600">The first photo is used as the primary vehicle image. Upload supports JPG, PNG, WEBP.</p>
              <div className="space-y-2">
                {manualPhotoUrls.map((photoUrl, index) => (
                  <div
                    key={`manual-photo-${index}`}
                    className={`grid gap-2 rounded-md p-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center ${
                      index === 0 ? "border border-brand-300 bg-brand-50/40" : "border border-transparent"
                    }`}
                  >
                    <Input
                      value={photoUrl}
                      onChange={(e) => updateManualPhotoInput(index, e.target.value)}
                      placeholder={`Photo URL ${index + 1}`}
                    />
                    <div className="h-14 w-20 overflow-hidden rounded-md border border-ink-200 bg-white">
                      {photoUrl.trim() ? (
                        <img src={photoUrl.trim()} alt={`Manual vehicle photo ${index + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-400">Preview</div>
                      )}
                    </div>
                    {index === 0 ? (
                      <span className="justify-self-start rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
                        Primary
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => makeManualPhotoPrimary(index)}
                        className="justify-self-start"
                      >
                        Make Primary
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" type="button" onClick={() => removeManualPhotoInput(index)} className="justify-self-start text-ink-600 hover:text-ink-900">
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <Input value={manualDiscountedPrice} onChange={(e) => setManualDiscountedPrice(e.target.value)} placeholder="Discounted price" />
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={upsertManualVehicleMutation.isPending || !manualVin.trim()}
                  onClick={() =>
                    confirmAction(
                      `Save manual vehicle ${manualVin.trim().toUpperCase()}?`,
                      saveManualVehicle,
                      "This will create or update a manual inventory vehicle."
                    )
                  }
                >
                  Save Manual Vehicle
                </Button>
                <Button size="sm" variant="outline" onClick={resetManualVehicleForm}>
                  Clear Form
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value.toUpperCase())}
                placeholder="Search manual vehicles by VIN or Y/M/M"
                className="max-w-md"
              />
              <Button size="sm" variant="outline" onClick={() => manualVehiclesQuery.refetch()} disabled={manualVehiclesQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="space-y-2">
              {manualVehicles.map((item) => (
                <div key={item.vin} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {item.year ?? "-"} {item.make ?? ""} {item.model ?? ""} {item.trim ?? ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => populateManualVehicleForm(item)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteManualVehicleMutation.isPending}
                        onClick={() =>
                          confirmAction(
                            `Delete manual vehicle ${item.vin}?`,
                            () => deleteManualVehicleMutation.mutate(item.vin),
                            "This removes the manual vehicle record."
                          )
                        }
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const vin = item.vin?.trim().toUpperCase();
                          if (!vin) return;
                          const result = addVinToFeaturedDraft(vin);
                          if (result === "already") return;
                          if (result === "full") {
                            toast({
                              variant: "error",
                              title: "Featured list full",
                              description: `You can select up to ${homepageFeaturedLimit} vehicles.`
                            });
                            return;
                          }
                        }}
                      >
                        Add to Featured
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-ink-600">
                    VIN {item.vin} | {item.vehicle_type ?? "-"} | Price: {formatCurrency(item.listed_price ?? item.msrp)} | Monthly:{" "}
                    {formatCurrency(item.monthly_payment)}
                  </p>
                </div>
              ))}
              {manualVehicles.length === 0 && <p className="text-sm text-ink-600">No manual vehicles found.</p>}
            </div>
          </CardContent>
        </Card>
        )}

        {isSuperAdmin && (
        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-600" />
              SEO Settings (Super Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-600">
              Manage page metadata manually. `site_default` applies globally; page-specific keys (like `home`) override it.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {SEO_PRESET_PAGE_KEYS.map((key) => (
                <Button key={key} size="sm" variant={normalizedSeoPageKey === key ? "default" : "outline"} onClick={() => setSeoPageKey(key)}>
                  {key}
                </Button>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
              <Input
                value={seoPageKey}
                onChange={(e) => setSeoPageKey(e.target.value.toLowerCase())}
                placeholder="page key (e.g. home, search, site_default)"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!isValidSeoPageKey || seoSettingQuery.isFetching}
                onClick={() => seoSettingQuery.refetch()}
              >
                Load
              </Button>
              <Button
                size="sm"
                disabled={!isValidSeoPageKey || upsertSeoSettingMutation.isPending}
                onClick={() =>
                  confirmAction(
                    `Save SEO setting for ${normalizedSeoPageKey}?`,
                    saveSeoSetting,
                    "This updates SEO metadata for this page key."
                  )
                }
              >
                Save SEO
              </Button>
              <Button size="sm" variant="outline" onClick={clearSeoForm}>
                Clear Form
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isValidSeoPageKey || deleteSeoSettingMutation.isPending}
                onClick={() =>
                  confirmAction(
                    `Delete SEO setting for ${normalizedSeoPageKey}?`,
                    () => deleteSeoSettingMutation.mutate(normalizedSeoPageKey),
                    "This removes the SEO override for this page key."
                  )
                }
              >
                Delete
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className={isValidSeoPageKey ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>
                {isValidSeoPageKey ? "Valid page key" : "Invalid page key"}
              </Badge>
              {seoSettingQuery.isFetching && <Badge>Loading setting...</Badge>}
              {seoSettingErrorStatus === 404 && <Badge className="border-amber-200 bg-amber-50 text-amber-700">New setting</Badge>}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Title" />
              <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="Keywords (comma-separated)" />
              <Input value={seoCanonicalUrl} onChange={(e) => setSeoCanonicalUrl(e.target.value)} placeholder="Canonical URL" />
              <Input value={seoRobots} onChange={(e) => setSeoRobots(e.target.value)} placeholder="Robots (e.g. index,follow)" />
              <Input value={seoOgTitle} onChange={(e) => setSeoOgTitle(e.target.value)} placeholder="OG title" />
              <Input value={seoOgImageUrl} onChange={(e) => setSeoOgImageUrl(e.target.value)} placeholder="OG image URL" />
            </div>

            <Textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Meta description"
              className="min-h-[84px]"
            />
            <Textarea
              value={seoOgDescription}
              onChange={(e) => setSeoOgDescription(e.target.value)}
              placeholder="OG description"
              className="min-h-[84px]"
            />
            <Textarea
              value={seoJsonLd}
              onChange={(e) => setSeoJsonLd(e.target.value)}
              placeholder="JSON-LD structured data"
              className="min-h-[160px] font-mono text-xs"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">Active:</span>
              <Button size="sm" variant={seoIsActive ? "default" : "outline"} onClick={() => setSeoIsActive(true)}>
                Yes
              </Button>
              <Button size="sm" variant={!seoIsActive ? "default" : "outline"} onClick={() => setSeoIsActive(false)}>
                No
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-800">Existing SEO Keys</p>
              <div className="flex flex-wrap gap-2">
                {seoSettings.map((item) => (
                  <Button
                    key={item.page_key}
                    size="sm"
                    variant={normalizedSeoPageKey === item.page_key ? "default" : "outline"}
                    onClick={() => setSeoPageKey(item.page_key)}
                  >
                    {item.page_key}
                  </Button>
                ))}
                {seoSettings.length === 0 && <p className="text-sm text-ink-600">No SEO settings saved yet.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {!isSuperAdmin && (
        <>
        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-600" />
              Lease Specials Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-600">
              Lease Specials page reads from offer overrides. Google sheet sync writes source <strong>sheet</strong>; manual admin updates write source <strong>broker</strong> by year/make/model.
            </p>
            <div className="grid gap-2 md:grid-cols-8">
              <Input value={offerYear} onChange={(e) => setOfferYear(e.target.value)} placeholder="Year" />
              <Input value={offerMake} onChange={(e) => setOfferMake(e.target.value)} placeholder="Make" />
              <Input value={offerModel} onChange={(e) => setOfferModel(e.target.value)} placeholder="Model" />
              <Input value={offerDownPayment} onChange={(e) => setOfferDownPayment(e.target.value)} placeholder="Down payment" />
              <Input value={offerMonthlyPayment} onChange={(e) => setOfferMonthlyPayment(e.target.value)} placeholder="Monthly payment" />
              <Input value={offerDiscountedPrice} onChange={(e) => setOfferDiscountedPrice(e.target.value)} placeholder="MSRP / price" />
              <Input value={offerTermMonths} onChange={(e) => setOfferTermMonths(e.target.value)} placeholder="Term (months)" />
              <Input value={offerMilesPerYear} onChange={(e) => setOfferMilesPerYear(e.target.value)} placeholder="Miles / year" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                {(["all", "new", "used"] as const).map((kind) => (
                  <Button
                    key={kind}
                    size="sm"
                    variant={offerVehicleType === kind ? "default" : "outline"}
                    onClick={() => setOfferVehicleType(kind)}
                  >
                    {kind}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={
                    upsertOfferOverrideByYmmMutation.isPending ||
                    !offerYear.trim() ||
                    !offerMake.trim() ||
                    !offerModel.trim()
                  }
                  onClick={() => {
                    const year = Number(offerYear.trim());
                    if (!Number.isFinite(year) || year <= 0) {
                      toast({ variant: "error", title: "Invalid year", description: "Please enter a valid year." });
                      return;
                    }
                    confirmAction(
                      `Save lease specials for ${year} ${offerMake.trim()} ${offerModel.trim()}?`,
                      () =>
                        upsertOfferOverrideByYmmMutation.mutate({
                          year,
                          make: offerMake.trim(),
                          model: offerModel.trim(),
                          vehicle_type: offerVehicleType,
                          down_payment: offerDownPayment.trim() ? Number(offerDownPayment) : null,
                          monthly_payment: offerMonthlyPayment.trim() ? Number(offerMonthlyPayment) : null,
                          discounted_price: offerDiscountedPrice.trim() ? Number(offerDiscountedPrice) : null,
                          term_months: offerTermMonths.trim() ? Number(offerTermMonths) : null,
                          miles_per_year: offerMilesPerYear.trim() ? Number(offerMilesPerYear) : null
                        }),
                      "All matching inventory rows by year/make/model will be updated."
                    );
                  }}
                >
                  Save by Y/M/M
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <Input value={offerVin} onChange={(e) => setOfferVin(e.target.value.toUpperCase())} placeholder="VIN (for remove only)" />
              <div className="md:col-span-3 flex gap-2">
                <Button
                  variant="outline"
                  disabled={deleteOfferOverrideMutation.isPending || !offerVin.trim()}
                  onClick={() => {
                    confirmAction(
                      `Remove lease special for VIN ${offerVin.trim()}?`,
                      () => deleteOfferOverrideMutation.mutate(offerVin.trim()),
                      "This removes the override record for this VIN."
                    );
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Input
                value={offerSearch}
                onChange={(e) => setOfferSearch(e.target.value.toUpperCase())}
                placeholder="Search VIN"
                className="max-w-sm"
              />
              <div className="flex gap-2">
                {(["all", "sheet", "dealer", "broker"] as const).map((source) => (
                  <Button
                    key={source}
                    size="sm"
                    variant={offerSourceFilter === source ? "default" : "outline"}
                    onClick={() => setOfferSourceFilter(source)}
                  >
                    {source}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {offerOverrides.map((item) => (
                <div key={`${item.vin}-${item.source}`} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">VIN {item.vin}</p>
                    <Badge>{item.source ?? "unknown"}</Badge>
                  </div>
                  <p className="text-xs text-ink-600">
                    Down: {item.down_payment ?? "-"} | Monthly: {item.monthly_payment ?? "-"} | MSRP/Price: {item.discounted_price ?? "-"} | Term: {item.term_months ?? "-"} | Miles/yr: {item.miles_per_year ?? "-"}
                  </p>
                  <p className="text-xs text-ink-500">Updated: {formatDateTime(item.updated_at)}</p>
                </div>
              ))}
              {offerOverrides.length === 0 && <p className="text-sm text-ink-600">No lease specials found.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Lead Webhook Delivery Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={leadDeliverySearch}
                onChange={(e) => setLeadDeliverySearch(e.target.value)}
                placeholder="Search by email, phone, VIN, or name"
                className="max-w-sm"
              />
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "sent", "failed", "skipped"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={leadDeliveryStatusFilter === status ? "default" : "outline"}
                    onClick={() => setLeadDeliveryStatusFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => leadDeliveryQuery.refetch()} disabled={leadDeliveryQuery.isFetching}>
                Refresh
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Last Error</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadDeliveryItems.map((item) => (
                  <TableRow key={item.lead_id}>
                    <TableCell>
                      <div className="text-sm font-medium text-ink-900">#{item.lead_id}</div>
                      <div className="text-xs text-ink-500">{formatDateTime(item.created_at)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-ink-900">{item.name ?? "-"}</div>
                      <div className="text-xs text-ink-600">{item.email ?? item.phone ?? "-"}</div>
                      <div className="text-xs text-ink-500">VIN {item.vin ?? "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${leadDeliveryBadgeClass(item.webhook_status)}`}>
                        {formatStatusLabel(item.webhook_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.webhook_attempts ?? 0}</TableCell>
                    <TableCell className="text-xs text-ink-600">{formatDateTime(item.webhook_delivered_at)}</TableCell>
                    <TableCell className="max-w-xs text-xs text-ink-600">{item.webhook_last_error ?? "-"}</TableCell>
                    <TableCell>
                      {item.webhook_status === "failed" || item.webhook_status === "skipped" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryLeadDeliveryMutation.isPending}
                          onClick={() =>
                            confirmAction(
                              `Retry webhook delivery for lead #${item.lead_id}?`,
                              () => retryLeadDeliveryMutation.mutate(item.lead_id),
                              "This re-sends the lead payload to Make/Zapier."
                            )
                          }
                        >
                          <Send className="h-3.5 w-3.5" />
                          Retry
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {leadDeliveryItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-ink-600">
                      No lead delivery logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Sheet Sync Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-700">
            <div className="flex flex-wrap gap-4">
              <span>Offer overrides: {statusQuery.data?.counts.offer_overrides ?? 0}</span>
              <span>Model scores: {statusQuery.data?.counts.model_scores ?? 0}</span>
            </div>
            {statusQuery.data?.items.map((row, index) => (
              <div key={`${row.sheet_name}-${index}`} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                <p className="font-medium">{row.sheet_name} ({row.tab_name})</p>
                <p className="text-xs text-ink-500">Last synced: {row.last_synced_at ?? "-"}</p>
                <p className="text-xs text-ink-500">Hash: {row.last_row_hash ?? "-"}</p>
                <p className="text-xs text-ink-500">Error: {row.last_error ?? "none"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Dealer Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesQuery.data?.sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>{source.name}</TableCell>
                    <TableCell>{source.status}</TableCell>
                    <TableCell>{source.lastSyncedAt ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Lender Rate Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-6">
              <Input value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="Lender name" />
              <Input value={creditTier} onChange={(e) => setCreditTier(e.target.value)} placeholder="Tier (A/B/C/D)" />
              <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Vehicle type" />
              <Input value={apr} onChange={(e) => setApr(e.target.value)} placeholder="APR" />
              <Input value={maxTerm} onChange={(e) => setMaxTerm(e.target.value)} placeholder="Max term" />
              <Button onClick={() => createRateMutation.mutate()} disabled={createRateMutation.isPending}>
                Add rate
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>APR</TableHead>
                  <TableHead>Max term</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lenderRatesQuery.data?.items ?? []).map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>{rate.lender_name}</TableCell>
                    <TableCell>{rate.credit_tier}</TableCell>
                    <TableCell>{rate.vehicle_type}</TableCell>
                    <TableCell>{rate.apr}</TableCell>
                    <TableCell>{rate.max_term_months}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
        )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={confirmState.open}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmState({ open: false, title: "", description: "", onConfirm: null });
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>{confirmState.description}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {confirmState.title}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmState({ open: false, title: "", description: "", onConfirm: null })}
              >
                No
              </Button>
              <Button
                onClick={() => {
                  const action = confirmState.onConfirm;
                  setConfirmState({ open: false, title: "", description: "", onConfirm: null });
                  action?.();
                }}
              >
                Yes, continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
