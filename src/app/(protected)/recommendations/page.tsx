"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { Gauge, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import LeadFormButton from "@/components/lead-form-button";

const WEIGHT_LABELS: Record<string, string> = {
  fun: "Fun to drive",
  styling: "Styling & design",
  performance: "Performance",
  practical: "Practicality",
  value: "Value / resale"
};

export default function RecommendationsPage() {
  const { user } = useAuth();
  const isDealerOrAdmin =
    user?.role === "dealer" ||
    user?.role === "admin" ||
    user?.role === "broker_admin" ||
    user?.role === "super_admin";

  const [fun, setFun] = useState(5);
  const [styling, setStyling] = useState(5);
  const [performance, setPerformance] = useState(5);
  const [practical, setPractical] = useState(5);
  const [value, setValue] = useState(5);
  const [vehicleType, setVehicleType] = useState<"new" | "used" | "all">("all");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [sortBy, setSortBy] = useState<"best" | "price" | "payment">("best");
  const [maxPayment, setMaxPayment] = useState<number | "">("");
  const [requestParams, setRequestParams] = useState<Record<string, unknown> | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["recommendations-filters", vehicleType],
    queryFn: () => api.getFilters({ vehicle_type: vehicleType }),
    enabled: !isDealerOrAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const makes = filtersQuery.data?.makes ?? [];
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const modelOptions = make ? modelsByMake[make] ?? [] : [];

  const recQuery = useQuery({
    queryKey: ["recommendations", requestParams],
    queryFn: () =>
      api.getRecommendations({
        fun: requestParams?.fun as number,
        styling: requestParams?.styling as number,
        performance: requestParams?.performance as number,
        practical: requestParams?.practical as number,
        value: requestParams?.value as number,
        vehicle_type: requestParams?.vehicle_type as "new" | "used" | "all",
        make: typeof requestParams?.make === "string" ? requestParams.make : undefined,
        model: typeof requestParams?.model === "string" ? requestParams.model : undefined,
        sort_by: (requestParams?.sort_by as "best" | "price" | "payment" | undefined) ?? "best",
        max_payment: typeof requestParams?.max_payment === "number" ? requestParams.max_payment : undefined,
        limit: 12
      }),
    enabled: requestParams !== null && !isDealerOrAdmin
  });

  const handleGetRecommendations = () => {
    setRequestParams({
      fun,
      styling,
      performance,
      practical,
      value,
      vehicle_type: vehicleType,
      max_payment: maxPayment === "" ? undefined : Number(maxPayment),
      make: make || undefined,
      model: model || undefined,
      sort_by: sortBy
    });
  };

  const items = recQuery.data?.items ?? [];

  if (isDealerOrAdmin) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="app-main space-y-6">
          <section className="tc-fade-up w-full border-b border-ink-200 bg-white py-6">
            <h1 className="market-heading flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-brand-700" />
              Best car for you
            </h1>
          </section>
          <Card className="border-ink-200 bg-ink-50/50">
            <CardContent className="py-8 text-center">
              <p className="text-ink-700">
                This feature is for <strong>car shoppers</strong>, not dealer or admin accounts.
              </p>
              <p className="mt-2 text-sm text-ink-600">
                Use Search to browse inventory, or go to your dashboard.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline">
                  <Link href="/search">Search cars</Link>
                </Button>
                {user?.role === "dealer" && (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/dealer">Dealer dashboard</Link>
                  </Button>
                )}
                {(user?.role === "admin" || user?.role === "broker_admin" || user?.role === "super_admin") && (
                  <Button asChild variant="outline">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-8">
        <section className="tc-fade-up w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Personalized</p>
          <h1 className="market-heading flex items-center gap-2 text-3xl sm:text-4xl">
            <Sparkles className="h-7 w-7 text-brand-700" />
            Recommended cars
          </h1>
          <p className="mt-2 max-w-xl text-ink-600">
            Set how much each factor matters to you. We rank inventory from your preferences — adjust sliders and run a new match anytime.
          </p>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="border-ink-200 bg-white lg:sticky lg:top-20">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-5 w-5 text-brand-700" />
                Your priorities
              </CardTitle>
              <p className="text-xs text-ink-600">Drag sliders (0 = ignore, 10 = very important)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "fun" as const, val: fun, set: setFun },
                { key: "styling" as const, val: styling, set: setStyling },
                { key: "performance" as const, val: performance, set: setPerformance },
                { key: "practical" as const, val: practical, set: setPractical },
                { key: "value" as const, val: value, set: setValue }
              ].map(({ key, val, set }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{WEIGHT_LABELS[key]}</Label>
                    <span className="text-sm text-ink-500">{val}</span>
                  </div>
                  <Slider value={[val]} min={0} max={10} step={1} onValueChange={(v) => set(v[0] ?? 5)} />
                </div>
              ))}

              <div className="space-y-2 border-t border-ink-200 pt-3">
                <Label>Vehicle type</Label>
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value as "new" | "used" | "all");
                    setMake("");
                    setModel("");
                  }}
                  className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Max monthly payment</Label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  placeholder="Optional"
                  value={maxPayment}
                  onChange={(e) => setMaxPayment(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Make</Label>
                <select
                  value={make}
                  onChange={(e) => {
                    setMake(e.target.value);
                    setModel("");
                  }}
                  className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any make</option>
                  {makes.map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make}
                  className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="">Any model</option>
                  {modelOptions.map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Sort</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "best" | "price" | "payment")}
                  className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="best">Best match</option>
                  <option value="price">Price</option>
                  <option value="payment">Payment</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleGetRecommendations} className="h-10 flex-1 rounded-full">
                  Show results
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {requestParams !== null && recQuery.isLoading && (
              <Card className="bg-white">
                <CardContent className="py-10 text-center text-ink-500">Finding best matches...</CardContent>
              </Card>
            )}
            {requestParams !== null && recQuery.isError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-6 text-center text-red-700">
                  Could not load recommendations. Try again.
                </CardContent>
              </Card>
            )}
            {requestParams !== null && recQuery.data && items.length === 0 && (
              <Card className="bg-white">
                <CardContent className="py-10 text-center text-ink-500">
                  No vehicles match your criteria. Try relaxing filters or different priorities.
                </CardContent>
              </Card>
            )}
            {requestParams !== null && items.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-3">
                  <h2 className="text-xl font-semibold text-ink-900">
                    <Sparkles className="mr-2 inline h-5 w-5 text-brand-700" />
                    Top matches <Badge>{items.length}</Badge>
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {items.map((item) => (
                    <RecommendationCard key={item.vin} item={item} />
                  ))}
                </div>
              </>
            )}

            {requestParams === null && (
              <Card className="border-ink-200 bg-ink-50/50">
                <CardContent className="py-10 text-center text-ink-600">
                  <Gauge className="mx-auto mb-2 h-5 w-5 text-ink-500" />
                  Set your priorities on the left and click &quot;Show results&quot;.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function RecommendationCard({
  item,
}: {
  item: {
    vin: string;
    make?: string;
    model?: string;
    trim?: string;
    vehicle_type?: string;
    score: number;
    photo?: string;
    photos?: string[];
  };
}) {
  const imageUrl = pickVehicleImage(item as never);
  const title = `${item.make ?? ""} ${item.model ?? ""}`.trim() || "Vehicle";
  const subtitle = `${item.trim ?? "Trim unavailable"} | ${(item.vehicle_type || "new").toString().toLowerCase()} car`;
  const detailsHref = `/vehicles/${item.vin}`;

  return (
    <Card className="search-card group overflow-hidden rounded-xl border border-ink-300 bg-[#f6f7f9] shadow-sm transition-[transform,box-shadow,border-color] duration-150 motion-safe:hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-ink-100">
          <Link href={detailsHref} aria-label={`View details for ${title}`}>
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                e.currentTarget.src = DEFAULT_CAR_IMAGE;
              }}
            />
          </Link>
        </div>
        <div className="space-y-2 px-3 pb-2.5 pt-3 sm:space-y-2.5 sm:px-3.5 sm:pb-3 sm:pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="line-clamp-1 font-display text-[14px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-lg">
                {title}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500 sm:text-xs">{subtitle}</p>
            </div>
          </div>
          <p className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-700 sm:text-xs">
            <Target className="h-4 w-4 text-ink-500" />
            Score: {typeof item.score === "number" ? item.score.toFixed(1) : "—"}
          </p>
          <div className="grid grid-cols-2 gap-2 border-t border-ink-300 pt-2">
            <LeadFormButton
              size="sm"
              className="flex-1 rounded-full"
              vin={item.vin}
              make={item.make ?? ""}
              model={item.model ?? ""}
              trim={item.trim ?? ""}
              source="recommendations_get_price"
            >
              <span className="max-[420px]:hidden">Get Price</span>
              <span className="hidden max-[420px]:inline">Get Price</span>
            </LeadFormButton>
            <Button size="sm" variant="outline" asChild className="rounded-full">
              <Link href={detailsHref}>More details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
