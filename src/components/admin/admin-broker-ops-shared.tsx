"use client";

import type { ComponentType } from "react";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FileSpreadsheet,
  Flag,
  FolderOpen,
  Handshake,
  History,
  Search
} from "lucide-react";

import type { Vehicle } from "@/lib/api";

export const DEAL_STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  broker_review: "Broker review",
  offer_ready: "Offer ready",
  locked: "Locked",
  docs_pending: "Docs pending",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export const DEAL_NEXT_STATUS: Record<string, string | null> = {
  inquiry: "broker_review",
  broker_review: "offer_ready",
  offer_ready: "locked",
  locked: "docs_pending",
  docs_pending: "delivered",
  delivered: null,
  cancelled: null
};

export const PIPELINE_STEPS: Array<{ key: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "inquiry", label: "Inquiry", icon: Search },
  { key: "broker_review", label: "Broker Review", icon: Handshake },
  { key: "offer_ready", label: "Offer Ready", icon: CircleDot },
  { key: "locked", label: "Approved", icon: Flag },
  { key: "docs_pending", label: "Delivery Scheduled", icon: Clock3 },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 }
];

export function statusLabel(status: string) {
  return DEAL_STATUS_LABELS[status] ?? status;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function toDateTimeLocal(value?: string | null) {
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

export function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatMileage(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString()} mi`;
}

export function vehicleTitle(vehicle?: Vehicle, fallbackVin?: string) {
  if (!vehicle) return `VIN ${fallbackVin ?? "-"}`;
  const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean);
  if (parts.length === 0) return `VIN ${vehicle.vin ?? fallbackVin ?? "-"}`;
  return parts.join(" ");
}

export function formatStatusLabel(value?: string | null) {
  const raw = (value ?? "not_submitted").toString();
  const status = raw.toLowerCase().trim();

  const map: Record<string, string> = {
    inquiry: "Request received",
    broker_review: "Under review",
    offer_ready: "Offer prepared",
    locked: "Approved",
    docs_pending: "Delivery scheduled",
    delivered: "Delivered",
    cancelled: "Cancelled",
    approved: "Approved",
    in_review: "In review",
    submitted: "Submitted",
    stored: "Received",
    rejected: "Declined",
    declined: "Declined",
    not_submitted: "Not submitted"
  };

  return map[status] ?? raw.replaceAll("_", " ");
}

function statusTone(kind: "timeline" | "docs" | "credit", value?: string | null) {
  const status = (value ?? "").toLowerCase();
  if (kind === "timeline") {
    if (status === "delivered") return "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/70 text-emerald-800";
    if (status === "cancelled") return "border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/70 text-rose-800";
    if (status === "locked" || status === "docs_pending") return "border-sky-200 bg-gradient-to-r from-sky-50 to-blue-100/65 text-sky-800";
    return "border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-100/60 text-brand-800";
  }
  if (status === "approved") return "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/70 text-emerald-800";
  if (status === "in_review" || status === "submitted" || status === "stored") {
    return "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-100/70 text-amber-800";
  }
  if (status === "rejected" || status === "declined") return "border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/70 text-rose-800";
  return "border-ink-200 bg-gradient-to-r from-white to-ink-50 text-ink-700";
}

export function HeaderStatusChip({
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${statusTone(kind, value)}`}
      title={`${label}: ${formatStatusLabel(value)}`}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/85 ring-1 ring-black/5">
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span>{formatStatusLabel(value)}</span>
    </span>
  );
}
