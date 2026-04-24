"use client";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Flag, Send } from "lucide-react";

import type { LeadDeliveryRecord, OfferOverrideRecord } from "@/lib/api";
import { AdminLenderRatesSection } from "@/components/admin/admin-lender-rates-section";
import { formatDateTime, formatStatusLabel } from "@/components/admin/admin-broker-ops-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function leadDeliveryBadgeClass(status?: string | null) {
  const value = (status ?? "").toLowerCase();
  if (value === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (value === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-ink-200 bg-white text-ink-600";
}

export type AdminBrokerAdminDataPanelProps = {
  offerYear: string;
  setOfferYear: (v: string) => void;
  offerMake: string;
  setOfferMake: (v: string) => void;
  offerModel: string;
  setOfferModel: (v: string) => void;
  offerDownPayment: string;
  setOfferDownPayment: (v: string) => void;
  offerMonthlyPayment: string;
  setOfferMonthlyPayment: (v: string) => void;
  offerDiscountedPrice: string;
  setOfferDiscountedPrice: (v: string) => void;
  offerTermMonths: string;
  setOfferTermMonths: (v: string) => void;
  offerMilesPerYear: string;
  setOfferMilesPerYear: (v: string) => void;
  offerVehicleType: "all" | "new" | "used";
  setOfferVehicleType: (v: "all" | "new" | "used") => void;
  offerVin: string;
  setOfferVin: (v: string) => void;
  offerSearch: string;
  setOfferSearch: (v: string) => void;
  offerSourceFilter: "all" | "sheet" | "dealer" | "broker";
  setOfferSourceFilter: (v: "all" | "sheet" | "dealer" | "broker") => void;
  offerOverrides: OfferOverrideRecord[];
  upsertOfferOverrideByYmmMutation: UseMutationResult<any, any, any, any>;
  deleteOfferOverrideMutation: UseMutationResult<any, any, string, any>;

  leadDeliverySearch: string;
  setLeadDeliverySearch: (v: string) => void;
  leadDeliveryStatusFilter: "all" | "pending" | "sent" | "failed" | "skipped";
  setLeadDeliveryStatusFilter: (v: "all" | "pending" | "sent" | "failed" | "skipped") => void;
  leadDeliveryQuery: UseQueryResult<any>;
  leadDeliveryItems: LeadDeliveryRecord[];
  retryLeadDeliveryMutation: UseMutationResult<any, any, number, any>;

  statusQuery: UseQueryResult<any>;
  sourcesQuery: UseQueryResult<any>;

  confirmAction: (title: string, onConfirm: () => void, description?: string) => void;
  toast: (opts: any) => void;
};

export function AdminBrokerAdminDataPanel({
  offerYear,
  setOfferYear,
  offerMake,
  setOfferMake,
  offerModel,
  setOfferModel,
  offerDownPayment,
  setOfferDownPayment,
  offerMonthlyPayment,
  setOfferMonthlyPayment,
  offerDiscountedPrice,
  setOfferDiscountedPrice,
  offerTermMonths,
  setOfferTermMonths,
  offerMilesPerYear,
  setOfferMilesPerYear,
  offerVehicleType,
  setOfferVehicleType,
  offerVin,
  setOfferVin,
  offerSearch,
  setOfferSearch,
  offerSourceFilter,
  setOfferSourceFilter,
  offerOverrides,
  upsertOfferOverrideByYmmMutation,
  deleteOfferOverrideMutation,
  leadDeliverySearch,
  setLeadDeliverySearch,
  leadDeliveryStatusFilter,
  setLeadDeliveryStatusFilter,
  leadDeliveryQuery,
  leadDeliveryItems,
  retryLeadDeliveryMutation,
  statusQuery,
  sourcesQuery,
  confirmAction,
  toast
}: AdminBrokerAdminDataPanelProps) {
  return (
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
            Lease Specials page reads from offer overrides (listings without a monthly payment are hidden). Google sheet sync writes source <strong>sheet</strong>;
            manual admin updates write source <strong>broker</strong> by year/make/model.
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
                disabled={upsertOfferOverrideByYmmMutation.isPending || !offerYear.trim() || !offerMake.trim() || !offerModel.trim()}
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

          <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {offerOverrides.map((item) => (
              <div key={`${item.vin}-${item.source}`} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">VIN {item.vin}</p>
                  <Badge>{item.source ?? "unknown"}</Badge>
                </div>
                <p className="text-xs text-ink-600">
                  Down: {item.down_payment ?? "-"} | Monthly: {item.monthly_payment ?? "-"} | MSRP/Price: {item.discounted_price ?? "-"} | Term:{" "}
                  {item.term_months ?? "-"} | Miles/yr: {item.miles_per_year ?? "-"}
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
            <span>Offer overrides: {statusQuery.data?.counts?.offer_overrides ?? 0}</span>
            <span>Model scores: {statusQuery.data?.counts?.model_scores ?? 0}</span>
          </div>
          {statusQuery.data?.items?.map((row: any, index: number) => (
            <div key={`${row.sheet_name}-${index}`} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
              <p className="font-medium">
                {row.sheet_name} ({row.tab_name})
              </p>
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
          <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {sourcesQuery.data?.sources?.map((source: any) => (
              <div key={source.id} className="rounded-lg border border-ink-200 bg-ink-50 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{source.name}</p>
                  <Badge>{source.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-600">Last synced: {source.lastSyncedAt ?? "-"}</p>
              </div>
            ))}
            {(sourcesQuery.data?.sources?.length ?? 0) === 0 && (
              <p className="text-sm text-ink-600">No dealer sources found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <AdminLenderRatesSection confirmAction={confirmAction} toast={toast} />
    </>
  );
}
