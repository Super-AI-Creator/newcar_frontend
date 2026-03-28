"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Send } from "lucide-react";

import type { LeadDeliveryRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
  const [expandedLeadRows, setExpandedLeadRows] = useState<Record<number, boolean>>({});

  const toggleLeadRow = (leadId: number) => {
    setExpandedLeadRows((prev) => ({ ...prev, [leadId]: !prev[leadId] }));
  };

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
            <TableHead className="w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadDeliveryItems.map((item) => (
            <Fragment key={item.lead_id}>
              <TableRow>
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
                  <div className="flex flex-wrap items-center gap-1.5">
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
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-ink-700"
                      type="button"
                      onClick={() => toggleLeadRow(item.lead_id)}
                      aria-expanded={Boolean(expandedLeadRows[item.lead_id])}
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 shrink-0 transition-transform", expandedLeadRows[item.lead_id] && "rotate-180")}
                        aria-hidden
                      />
                      {expandedLeadRows[item.lead_id] ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedLeadRows[item.lead_id] ? (
                <TableRow className="bg-ink-50/80 hover:bg-ink-50/80">
                  <TableCell colSpan={7} className="align-top text-sm text-ink-700">
                    <div className="space-y-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Delivery &amp; notes</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-ink-200 bg-white p-3">
                          <p className="text-xs font-medium text-ink-500">Last webhook attempt</p>
                          <p className="mt-1 text-sm text-ink-900">{formatDateTime(item.webhook_last_attempt_at)}</p>
                          <p className="mt-2 text-xs font-medium text-ink-500">Attempts</p>
                          <p className="text-sm text-ink-900">{item.webhook_attempts ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-ink-200 bg-white p-3">
                          <p className="text-xs font-medium text-ink-500">Last error</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">
                            {item.webhook_last_error?.trim() ? item.webhook_last_error : "—"}
                          </p>
                        </div>
                      </div>
                      {item.notes ? (
                        <div className="rounded-lg border border-ink-200 bg-white p-3">
                          <p className="text-xs font-medium text-ink-500">Full notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{item.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
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

