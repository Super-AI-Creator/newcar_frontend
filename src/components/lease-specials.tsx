"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pickVehicleImage, DEFAULT_CAR_IMAGE } from "@/lib/vehicle-image";
import DealSearchLoader from "@/components/deal-search-loader";

import { env } from "@/lib/env";
const LEAD_FORM_URL = env.leadFormUrl;

export default function LeaseSpecials() {
  const specialsQuery = useQuery({
    queryKey: ["homepage-lease-specials"],
    queryFn: () => api.search({ vehicle_type: "new", page: 1, page_size: 6, sort: "best_deal" }),
  });

  if (specialsQuery.isLoading) {
    return <DealSearchLoader />;
  }

  const vehicles = specialsQuery.data?.results ?? [];
  if (vehicles.length === 0) {
    return <p className="text-sm text-ink-500">No live specials available right now.</p>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {vehicles.map((vehicle) => {
        const leadQuery = new URLSearchParams({
          vin: vehicle.vin,
          make: vehicle.make ?? "",
          model: vehicle.model ?? "",
          trim: vehicle.trim ?? "",
          year: vehicle.year ? String(vehicle.year) : "",
        });
        const leadUrl = `${LEAD_FORM_URL}?${leadQuery.toString()}`;

        return (
          <Card key={vehicle.vin} className="search-card group overflow-hidden border-ink-200 bg-white transition-[transform,box-shadow,border-color] duration-150 motion-safe:hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
            <CardContent className="p-0">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-100">
                <Link href={`/vehicles/${encodeURIComponent(vehicle.vin)}`} aria-label={`View details for ${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`}>
                  <img
                    src={pickVehicleImage(vehicle)}
                    alt={`${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`}
                    className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                      e.currentTarget.src = DEFAULT_CAR_IMAGE;
                    }}
                  />
                </Link>
              </div>
              <div className="space-y-3 p-4">
                <h3 className="font-display text-xl font-semibold text-ink-900">
                  <Link href={`/vehicles/${encodeURIComponent(vehicle.vin)}`} className="hover:underline">
                    {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                  </Link>
                </h3>
                <div className="text-sm text-ink-700">
                  {vehicle.discounted !== undefined && vehicle.discounted !== null && (
                    <p>Discounted Price: ${vehicle.discounted.toLocaleString()}</p>
                  )}
                  {vehicle.down !== undefined && vehicle.down !== null && (
                    <p>Down Payment: ${vehicle.down.toLocaleString()}</p>
                  )}
                  {vehicle.monthly !== undefined && vehicle.monthly !== null && (
                    <p>Monthly Payment: ${vehicle.monthly.toLocaleString()}/mo</p>
                  )}
                  {(vehicle.down === undefined || vehicle.down === null) &&
                    (vehicle.monthly === undefined || vehicle.monthly === null) &&
                    (vehicle.discounted === undefined || vehicle.discounted === null) && (
                      <p>Call for custom lease special.</p>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={leadUrl} target="_blank" rel="noreferrer">
                      Verify Availability
                    </a>
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link href={`/vehicles/${encodeURIComponent(vehicle.vin)}`}>View</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
