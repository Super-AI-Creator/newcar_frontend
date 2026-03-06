"use client";

import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import LeadFormButton from "@/components/lead-form-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CarFront, Heart, Search, Tag } from "lucide-react";

export default function FavoritesPage() {
  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: api.favorites
  });

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="tc-fade-up w-full border-b border-ink-200 bg-white py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="market-kicker">Saved Inventory</p>
              <h1 className="market-heading flex items-center gap-2 text-3xl sm:text-4xl">
                <Heart className="h-7 w-7 text-brand-700" />
                Favorites
              </h1>
            </div>
            <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
              <Heart className="mr-1 h-3.5 w-3.5" />
              {(favoritesQuery.data?.items.length ?? 0).toLocaleString()} saved
            </Badge>
          </div>
        </section>

        {favoritesQuery.isLoading && (
          <Card className="bg-white">
            <CardContent className="py-10 text-center text-ink-500">Loading favorites...</CardContent>
          </Card>
        )}
        {favoritesQuery.data && favoritesQuery.data.items.length === 0 && (
          <Card className="bg-white">
            <CardContent className="space-y-3 py-10 text-center">
              <p className="text-ink-500">No favorites yet.</p>
              <Button asChild variant="outline">
                <Link href="/search?vehicle_type=new">
                  <Search className="mr-1 h-4 w-4" />
                  Browse cars
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favoritesQuery.data?.items.map((vehicle) => {
              const normalizedType = (vehicle.vehicle_type ?? "new").toString().toLowerCase();
              const normalizedCondition = (vehicle.condition ?? "").toString().toLowerCase();
              const inferredType =
                normalizedCondition === "new"
                  ? "new"
                  : normalizedCondition === "used" || normalizedCondition === "cpo"
                  ? "used"
                  : normalizedType === "used"
                  ? "used"
                  : "new";
              const isUsed = inferredType === "used";
              const primaryPrice = isUsed
                ? vehicle.listed_price ?? vehicle.discounted ?? vehicle.msrp ?? null
                : vehicle.discounted ?? vehicle.msrp ?? vehicle.listed_price ?? null;
              return (
                <Card key={vehicle.vin} className="group overflow-hidden rounded-2xl border border-ink-300 bg-[#f6f7f9] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                  <CardContent className="p-0">
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-ink-100">
                      <Link href={`/vehicles/${vehicle.vin}`} aria-label={`View ${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`}>
                        <img
                          src={pickVehicleImage(vehicle)}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                            e.currentTarget.src = DEFAULT_CAR_IMAGE;
                          }}
                        />
                      </Link>
                    </div>
                    <div className="space-y-3 px-4 pb-4 pt-4">
                      <h3 className="line-clamp-1 font-display text-xl font-semibold text-ink-900">
                        <Link href={`/vehicles/${vehicle.vin}`} className="hover:underline">
                          {vehicle.year ?? ""} {vehicle.make ?? ""} {vehicle.model ?? ""}
                        </Link>
                      </h3>
                      <p className="flex items-center gap-1 text-sm text-ink-700">
                        <Tag className="h-4 w-4 text-ink-500" />
                        {vehicle.trim ?? "Trim unavailable"}
                      </p>
                      <div className="border-t border-ink-300 pt-3">
                        <p className="text-2xl font-bold text-ink-900">
                          {primaryPrice
                            ? `$${primaryPrice.toLocaleString()}`
                            : "Call for price"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-ink-300 pt-3">
                        <p className="flex items-center gap-1 text-sm text-ink-600">
                          <CarFront className="h-4 w-4 text-ink-500" />
                          VIN {vehicle.vin}
                        </p>
                        <LeadFormButton
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          vin={vehicle.vin}
                          make={vehicle.make ?? ""}
                          model={vehicle.model ?? ""}
                          trim={vehicle.trim ?? ""}
                          year={vehicle.year}
                          source="favorites_get_price"
                        >
                          Get Price
                        </LeadFormButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </main>
    </div>
  );
}
