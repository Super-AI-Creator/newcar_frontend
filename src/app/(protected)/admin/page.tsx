"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Deal, type Vehicle } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/toast-provider";
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

  const sourcesQuery = useQuery({ queryKey: ["admin-sources"], queryFn: api.adminSources });
  const statusQuery = useQuery({ queryKey: ["admin-sync-status"], queryFn: api.syncStatus });
  const dealsQuery = useQuery({ queryKey: ["admin-deals-queue"], queryFn: api.brokerQueue });
  const messagesQuery = useQuery({ queryKey: ["admin-messages"], queryFn: api.messages });
  const lenderRatesQuery = useQuery({ queryKey: ["admin-lender-rates"], queryFn: api.lenderRates });
  const offerOverridesQuery = useQuery({
    queryKey: ["admin-offer-overrides", offerSourceFilter, offerSearch],
    queryFn: () =>
      api.adminOfferOverrides({
        source: offerSourceFilter === "all" ? undefined : offerSourceFilter,
        q: offerSearch || undefined,
        limit: 200
      })
  });
  const creditApplicationsQuery = useQuery({
    queryKey: ["admin-credit-applications", creditStatusFilter, creditSearch],
    queryFn: () =>
      api.brokerCreditApplications({
        status: creditStatusFilter === "all" ? undefined : creditStatusFilter,
        q: creditSearch || undefined,
        page_size: 50
      })
  });
  const docSubmissionsQuery = useQuery({
    queryKey: ["admin-doc-submissions", docStatusFilter, docSearch],
    queryFn: () =>
      api.brokerDocSubmissions({
        status: docStatusFilter === "all" ? undefined : docStatusFilter,
        q: docSearch || undefined,
        page_size: 50
      })
  });
  const dealEventsQuery = useQuery({
    queryKey: ["admin-deal-events", expandedDealId],
    queryFn: () => api.dealEvents(expandedDealId as number),
    enabled: expandedDealId !== null
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
    return Array.from(set).sort();
  }, [deals, threads]);

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
              <h1 className="market-heading text-3xl sm:text-4xl">Broker Workspace</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{totalDeals} deals</Badge>
              <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>Sync Sheets</Button>
            </div>
          </div>
        </section>

        <Tabs value={adminTab} onValueChange={(value) => setAdminTab(value as "broker_ops" | "credit_docs" | "admin_data")} className="space-y-4">
          <TabsList className="bg-ink-100 p-1">
            <TabsTrigger value="broker_ops">Broker Operations</TabsTrigger>
            <TabsTrigger value="credit_docs">
              Credit &amp; Docs
              {(pendingCreditCount > 0 || pendingDocCount > 0) && (
                <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                  {pendingCreditCount + pendingDocCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="admin_data">Admin Data</TabsTrigger>
          </TabsList>

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
                    </div>
                  ))}
                  {docSubmissions.length === 0 && <p className="text-sm text-ink-600">No document submissions found.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin_data" className="space-y-6">
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
