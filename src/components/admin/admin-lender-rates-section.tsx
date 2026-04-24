"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Percent, Trash2, X } from "lucide-react";
import { useState } from "react";

import { api, type LenderRate } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

type EditDraft = {
  lender_name: string;
  credit_tier: string;
  vehicle_type: string;
  apr: string;
  max_term_months: string;
};

export type AdminLenderRatesSectionProps = {
  confirmAction: (title: string, onConfirm: () => void, description?: string) => void;
  toast: (opts: { variant?: string; title: string; description?: string }) => void;
};

export function AdminLenderRatesSection({ confirmAction, toast }: AdminLenderRatesSectionProps) {
  const queryClient = useQueryClient();
  const lenderRatesQuery = useQuery({ queryKey: ["admin-lender-rates"], queryFn: api.lenderRates });

  const [lenderName, setLenderName] = useState("Default Lender");
  const [creditTier, setCreditTier] = useState("B");
  const [vehicleType, setVehicleType] = useState("all");
  const [apr, setApr] = useState("5.0");
  const [maxTerm, setMaxTerm] = useState("72");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const invalidateRates = () => queryClient.invalidateQueries({ queryKey: ["admin-lender-rates"] });

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
      invalidateRates();
      toast({ variant: "success", title: "Rate added" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Could not add rate", description: errorMessage(err, "Invalid rate payload.") })
  });

  const updateRateMutation = useMutation({
    mutationFn: (payload: { id: number; body: Omit<LenderRate, "id" | "created_at" | "updated_at"> }) =>
      api.updateLenderRate(payload.id, payload.body),
    onSuccess: () => {
      invalidateRates();
      setEditingId(null);
      setEditDraft(null);
      toast({ variant: "success", title: "Rate updated" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Update failed", description: errorMessage(err, "Could not save rate.") })
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: number) => api.deleteLenderRate(id),
    onSuccess: () => {
      invalidateRates();
      setEditingId(null);
      setEditDraft(null);
      toast({ variant: "success", title: "Rate deleted" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not delete rate.") })
  });

  const startEdit = (rate: LenderRate) => {
    setEditingId(rate.id);
    setEditDraft({
      lender_name: rate.lender_name,
      credit_tier: rate.credit_tier,
      vehicle_type: rate.vehicle_type,
      apr: String(rate.apr),
      max_term_months: String(rate.max_term_months)
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (editingId === null || !editDraft) return;
    const aprNum = Number(editDraft.apr);
    const termNum = Number(editDraft.max_term_months);
    if (!editDraft.lender_name.trim()) {
      toast({ variant: "error", title: "Lender name required" });
      return;
    }
    if (!editDraft.credit_tier.trim()) {
      toast({ variant: "error", title: "Tier required" });
      return;
    }
    if (!Number.isFinite(aprNum) || aprNum < 0) {
      toast({ variant: "error", title: "Invalid APR" });
      return;
    }
    if (!Number.isFinite(termNum) || termNum <= 0) {
      toast({ variant: "error", title: "Invalid max term" });
      return;
    }
    updateRateMutation.mutate({
      id: editingId,
      body: {
        lender_name: editDraft.lender_name.trim(),
        credit_tier: editDraft.credit_tier.trim().toUpperCase(),
        vehicle_type: editDraft.vehicle_type.trim().toLowerCase(),
        apr: aprNum,
        max_term_months: Math.round(termNum)
      }
    });
  };

  const items = lenderRatesQuery.data?.items ?? [];
  const busy = createRateMutation.isPending || updateRateMutation.isPending || deleteRateMutation.isPending;

  return (
    <Card className="border-ink-200 bg-white">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Percent className="h-4 w-4 text-brand-600" />
          Prequal lender rates
          <Badge className="border-ink-300 bg-ink-50 font-normal text-ink-600">/credit/prequal</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-600">
          Rows here are matched by credit tier and vehicle type (<code className="rounded bg-ink-100 px-1">new</code>,{" "}
          <code className="rounded bg-ink-100 px-1">used</code>, or <code className="rounded bg-ink-100 px-1">all</code>) when shoppers use
          prequal and lender options.
        </p>
        <div className="grid gap-2 md:grid-cols-6">
          <Input value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="Lender name" />
          <Input value={creditTier} onChange={(e) => setCreditTier(e.target.value)} placeholder="Tier (A/B/C/D)" />
          <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Vehicle type" />
          <Input value={apr} onChange={(e) => setApr(e.target.value)} placeholder="APR" />
          <Input value={maxTerm} onChange={(e) => setMaxTerm(e.target.value)} placeholder="Max term" />
          <Button onClick={() => createRateMutation.mutate()} disabled={busy}>
            Add rate
          </Button>
        </div>
        {lenderRatesQuery.isLoading && <p className="text-sm text-ink-600">Loading rates…</p>}
        {lenderRatesQuery.isError && (
          <p className="text-sm text-red-700">Could not load lender rates. Check permissions or try again.</p>
        )}
        {!lenderRatesQuery.isLoading && !lenderRatesQuery.isError && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>APR</TableHead>
                  <TableHead>Max term</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((rate: LenderRate) => {
                  const isEditing = editingId === rate.id;
                  return (
                    <TableRow key={rate.id}>
                      <TableCell>
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.lender_name}
                            onChange={(e) => setEditDraft({ ...editDraft, lender_name: e.target.value })}
                            className="h-8 min-w-[8rem]"
                          />
                        ) : (
                          rate.lender_name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.credit_tier}
                            onChange={(e) => setEditDraft({ ...editDraft, credit_tier: e.target.value })}
                            className="h-8 w-20"
                          />
                        ) : (
                          rate.credit_tier
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.vehicle_type}
                            onChange={(e) => setEditDraft({ ...editDraft, vehicle_type: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          rate.vehicle_type
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.apr}
                            onChange={(e) => setEditDraft({ ...editDraft, apr: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          rate.apr
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.max_term_months}
                            onChange={(e) => setEditDraft({ ...editDraft, max_term_months: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          rate.max_term_months
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button type="button" size="sm" variant="default" onClick={saveEdit} disabled={busy}>
                              Save
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(rate)} disabled={busy}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-700 hover:bg-red-50"
                              disabled={busy}
                              onClick={() =>
                                confirmAction(
                                  "Delete this lender rate?",
                                  () => deleteRateMutation.mutate(rate.id),
                                  "This affects prequal and lender-option estimates immediately."
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {items.length === 0 && !lenderRatesQuery.isLoading && !lenderRatesQuery.isError && (
          <p className="text-sm text-ink-600">No lender rates yet. Add a row above.</p>
        )}
      </CardContent>
    </Card>
  );
}
