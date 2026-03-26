"use client";

import { Send } from "lucide-react";

import type { LeadDeliveryRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeadDeliveryStatusFilter = "all" | "pending" | "sent" | "failed" | "skipped";

export type AdminLeadDeliveryPanelProps = {
  leadDeliverySearch: string;
  setLeadDeliverySearch: (next: string) => void;
  leadDeliveryStatusFilter: LeadDeliveryStatusFilter;
  setLeadDeliveryStatusFilter: (next: LeadDeliveryStatusFilter) => void;

  leadDeliveryQueryRefetch: () => void;
  leadDeliveryQueryIsFetching: boolean;
  leadDeliveryItems: LeadDeliveryRecord[];

  retryLeadDeliveryMutationIsPending: boolean;
  onRetryLeadDelivery: (leadId: number) => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

function LeadDeliveryStatusButtons({
  leadDeliveryStatusFilter,
  setLeadDeliveryStatusFilter,
}: {
  leadDeliveryStatusFilter: LeadDeliveryStatusFilter;
  setLeadDeliveryStatusFilter: (next: LeadDeliveryStatusFilter) => void;
}) {
  const statuses: LeadDeliveryStatusFilter[] = ["all", "pending", "sent", "failed", "skipped"];
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
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
  );
}

export function AdminLeadDeliveryPanel({
  leadDeliverySearch,
  setLeadDeliverySearch,
  leadDeliveryStatusFilter,
  setLeadDeliveryStatusFilter,
  leadDeliveryQueryRefetch,
  leadDeliveryQueryIsFetching,
  leadDeliveryItems,
  retryLeadDeliveryMutationIsPending,
  onRetryLeadDelivery,
}: AdminLeadDeliveryPanelProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={leadDeliverySearch}
          onChange={(e) => setLeadDeliverySearch(e.target.value)}
          placeholder="Search by email, phone, VIN, or name"
          className="max-w-sm"
        />
        <LeadDeliveryStatusButtons
          leadDeliveryStatusFilter={leadDeliveryStatusFilter}
          setLeadDeliveryStatusFilter={setLeadDeliveryStatusFilter}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={leadDeliveryQueryRefetch}
          disabled={leadDeliveryQueryIsFetching}
        >
          Refresh
        </Button>
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Delivered</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadDeliveryItems.map((item) => (
            <TableRow key={item.lead_id}>
              <TableCell>
                <div className="text-sm font-medium text-ink-900">#{item.lead_id}</div>
                <div className="text-xs text-ink-500">{formatDateTime(item.created_at)}</div>
                {item.source ? <div className="text-xs text-ink-500">Source: {item.source}</div> : null}
              </TableCell>
              <TableCell>
                <div className="text-sm text-ink-900">{item.name ?? "-"}</div>
                <div className="text-xs text-ink-600">{item.email ?? "-"}</div>
                <div className="text-xs text-ink-500">{item.phone ?? "-"}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-ink-900">
                  {item.vehicle ?? (item.vin ? `VIN ${item.vin}` : "-")}
                </div>
                {item.notes ? (
                  <div className="max-w-xs truncate text-xs text-ink-500" title={item.notes}>
                    {item.notes}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge className={`border ${leadDeliveryBadgeClass(item.webhook_status)}`}>
                  {formatStatusLabel(item.webhook_status)}
                </Badge>
              </TableCell>
              <TableCell>{item.webhook_attempts ?? 0}</TableCell>
              <TableCell className="text-xs text-ink-600">{formatDateTime(item.webhook_delivered_at)}</TableCell>
              <TableCell>
                {item.webhook_status === "failed" || item.webhook_status === "skipped" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryLeadDeliveryMutationIsPending}
                    onClick={() => onRetryLeadDelivery(item.lead_id)}
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
                No leads found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

