"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Vehicle } from "@/lib/api";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";

const PAGE_SIZE = 20;

function DealerSkeleton() {
  return (
    <Card className="animate-pulse border-ink-200 bg-ink-100/50">
      <CardHeader>
        <div className="h-6 w-3/4 rounded bg-ink-300" />
        <div className="mt-1 h-4 w-24 rounded bg-ink-200" />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-6">
        <div className="h-10 rounded bg-ink-200" />
        <div className="h-10 rounded bg-ink-200" />
        <div className="h-10 rounded bg-ink-200" />
        <div className="h-10 rounded bg-ink-200" />
        <div className="h-10 rounded bg-ink-200" />
        <div className="h-10 w-24 rounded bg-ink-200" />
      </CardContent>
    </Card>
  );
}

export default function DealerDashboard() {
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const inventoryQuery = useQuery({
    queryKey: ["dealer-inventory", page],
    queryFn: () => api.dealerInventory({ page, page_size: PAGE_SIZE, include_total: false }),
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const items = inventoryQuery.data?.items ?? [];
  const total = inventoryQuery.data?.total ?? null;
  const hasMore = !!inventoryQuery.data?.has_more;
  const totalPages = total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null;
  const start = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = start === 0 ? 0 : start + items.length - 1;
  const isLoading = inventoryQuery.isLoading;
  const isError = inventoryQuery.isError;

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="tc-fade-up w-full border-b border-ink-200 bg-white py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="market-kicker">Dealer Workspace</p>
              <h1 className="market-heading text-3xl sm:text-4xl">Inventory Offers</h1>
            </div>
            {!isLoading && !isError && (
              <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
                {total != null ? `${total.toLocaleString()} vehicles` : "Inventory loaded"}
              </Badge>
            )}
          </div>
          {!isLoading && !isError && items.length > 0 && (
            <p className="mt-2 text-sm text-ink-600">
              Showing {start.toLocaleString()}-{end.toLocaleString()}
              {total != null ? ` of ${total.toLocaleString()}` : ""}
            </p>
          )}
        </section>
        <div className="grid gap-6">
          {isLoading && (
            <>
              <p className="text-sm text-ink-500">Loading inventory...</p>
              {Array.from({ length: 5 }).map((_, i) => (
                <DealerSkeleton key={i} />
              ))}
            </>
          )}
          {isError && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-6">
                <p className="font-medium text-amber-800">Could not load inventory</p>
                <p className="mt-1 text-sm text-amber-700">
                  The server may have restarted or the request failed. Click Retry.
                </p>
                <Button className="mt-4" onClick={() => inventoryQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <p className="text-ink-500">No vehicles in the list.</p>
          )}
          {!isLoading && !isError && items.map((vehicle: Vehicle) => (
            <DealerOfferCard key={vehicle.vin} vehicle={vehicle} onSaved={() => inventoryQuery.refetch()} toast={toast} />
          ))}
        </div>
        {!isLoading && !isError && ((totalPages != null && totalPages > 1) || (totalPages == null && (page > 1 || hasMore))) && (
          <div className="flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-ink-600">
              Page {page}{totalPages != null ? ` of ${totalPages}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={totalPages != null ? page >= totalPages : !hasMore}
              onClick={() => setPage((p) => (totalPages != null ? Math.min(totalPages, p + 1) : p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function DealerOfferCard({
  vehicle,
  onSaved,
  toast
}: {
  vehicle: Vehicle;
  onSaved?: () => void;
  toast: (opts: { title: string; description?: string; variant?: "success" | "error" | "info" }) => void;
}) {
  const [down, setDown] = useState(vehicle.down ?? 0);
  const [monthly, setMonthly] = useState(vehicle.monthly ?? 0);
  const [discounted, setDiscounted] = useState(vehicle.discounted ?? 0);
  const [termMonths, setTermMonths] = useState(vehicle.term_months ?? 0);
  const [milesPerYear, setMilesPerYear] = useState(vehicle.miles_per_year ?? 0);

  const mutation = useMutation({
    mutationFn: () => {
      if (!vehicle.year || !vehicle.make || !vehicle.model) {
        throw new Error("Year, make, and model are required for Y/M/M offer updates.");
      }
      const normalizedVehicleType =
        vehicle.vehicle_type === "new" || vehicle.vehicle_type === "used" ? vehicle.vehicle_type : "all";
      return api.updateOfferByYmm({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vehicle_type: normalizedVehicleType,
        down: down > 0 ? down : null,
        monthly: monthly > 0 ? monthly : null,
        discounted: discounted > 0 ? discounted : null,
        term_months: termMonths > 0 ? termMonths : null,
        miles_per_year: milesPerYear > 0 ? milesPerYear : null
      });
    },
    onSuccess: (result) => {
      toast({
        variant: "success",
        title: "Offers saved",
        description: `${result.updated_count} vehicles updated for ${vehicle.year} ${vehicle.make} ${vehicle.model}`
      });
      onSaved?.();
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save offer."
      });
    }
  });

  return (
    <Card className="group tc-fade-up border-ink-200 bg-white transition hover:shadow-card-hover">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </span>
          <span className="text-xs font-medium text-ink-500">VIN {vehicle.vin}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-6">
        <Input
          type="number"
          value={down}
          onChange={(e) => setDown(Number(e.target.value))}
          placeholder="Down ($)"
        />
        <Input
          type="number"
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
          placeholder="Monthly ($)"
        />
        <Input
          type="number"
          value={discounted}
          onChange={(e) => setDiscounted(Number(e.target.value))}
          placeholder="MSRP / Price ($)"
        />
        <Input
          type="number"
          value={termMonths}
          onChange={(e) => setTermMonths(Number(e.target.value))}
          placeholder="Term (months)"
        />
        <Input
          type="number"
          value={milesPerYear}
          onChange={(e) => setMilesPerYear(Number(e.target.value))}
          placeholder="Miles / year"
        />
        <Button
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !vehicle.year || !vehicle.make || !vehicle.model}
        >
          {mutation.isPending ? "Saving..." : "Save by Y/M/M"}
        </Button>
      </CardContent>
    </Card>
  );
}
