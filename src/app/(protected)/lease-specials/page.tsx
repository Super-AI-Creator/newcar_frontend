"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, CarFront, CircleDollarSign, Info, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type Vehicle } from "@/lib/api";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import DealSearchLoader from "@/components/deal-search-loader";
import LeadFormButton from "@/components/lead-form-button";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";

const sortOptions = [
  { value: "payment_low_high", label: "Payment: Low to High" },
  { value: "payment_high_low", label: "Payment: High to Low" },
  { value: "msrp_low_high", label: "Price: Low to High" },
  { value: "price_high_low", label: "Price: High to Low" },
  { value: "year_newest", label: "Year: Newest First" },
  { value: "year_oldest", label: "Year: Oldest First" },
  { value: "make_a_z", label: "Make: A to Z" },
  { value: "make_z_a", label: "Make: Z to A" },
  { value: "model_a_z", label: "Model: A to Z" },
  { value: "model_z_a", label: "Model: Z to A" }
];
const clientOnlySorts = new Set([
  "payment_low_high",
  "payment_high_low",
  "year_newest",
  "year_oldest",
  "make_a_z",
  "make_z_a",
  "model_a_z",
  "model_z_a"
]);

const paymentPresets = [399, 499, 599, 699, 799];
const defaultMaxPayment = 10000;
const defaultMaxPrice = 1000000;
const pageSize = 12;
const ANY_MAKE = "__any_make__";
const ANY_MODEL = "__any_model__";

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBackendSort(sort: string) {
  return clientOnlySorts.has(sort) ? undefined : sort;
}

export default function LeaseSpecialsPage() {
  return (
    <Suspense fallback={<LeaseSpecialsPageFallback />}>
      <LeaseSpecialsPageContent />
    </Suspense>
  );
}

function LeaseSpecialsPageFallback() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main">
        <DealSearchLoader />
      </main>
    </div>
  );
}

function LeaseSpecialsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("view") === "all" ? "all" : "lease";

  const [make, setMake] = useState(searchParams.get("make") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? sortOptions[0].value);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [maxPayment, setMaxPayment] = useState(parsePositiveNumber(searchParams.get("max_payment"), defaultMaxPayment));
  const [maxPrice, setMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultMaxPrice));
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), 1));

  const filtersQuery = useQuery({
    queryKey: ["filters", "lease-specials"],
    queryFn: () => api.getFilters({ vehicle_type: "new", offers_only: true }),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const sanitizeOptions = (items: string[] | undefined) =>
    Array.from(new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => !!item)));

  const makes = sanitizeOptions(filtersQuery.data?.makes);
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const models = useMemo(() => {
    if (!make) return [];
    return sanitizeOptions(modelsByMake[make]);
  }, [make, modelsByMake]);

  const params = useMemo(
    () => ({
      vehicle_type: "new",
      offers_only: true,
      make,
      model,
      max_payment: maxPayment,
      max_price: maxPrice,
      sort: getBackendSort(sort),
      page,
      page_size: pageSize
    }),
    [make, model, maxPayment, maxPrice, sort, page]
  );
  const [appliedParams, setAppliedParams] = useState(params);

  const resultsQuery = useQuery({
    queryKey: ["lease-specials", appliedParams],
    queryFn: () => api.search(appliedParams),
    staleTime: 20_000,
    refetchOnWindowFocus: false
  });

  const resultItems = resultsQuery.data?.results ?? [];
  const sortedResultItems = useMemo(() => {
    const items = [...resultItems];
    const vehiclePrice = (item: Vehicle, fallback: number) =>
      item.discounted ?? item.msrp ?? item.listed_price ?? fallback;
    const byTextAsc = (a: string | undefined, b: string | undefined) => {
      const left = (a ?? "").trim();
      const right = (b ?? "").trim();
      if (left && right) return left.localeCompare(right, undefined, { sensitivity: "base" });
      if (left || right) return left ? -1 : 1;
      return 0;
    };

    if (sort === "payment_low_high") {
      items.sort((a, b) => {
        const aHasMonthly = typeof a.monthly === "number";
        const bHasMonthly = typeof b.monthly === "number";
        if (aHasMonthly && bHasMonthly) {
          const aMonthly = a.monthly as number;
          const bMonthly = b.monthly as number;
          if (aMonthly !== bMonthly) return aMonthly - bMonthly;
        } else if (aHasMonthly !== bHasMonthly) {
          return aHasMonthly ? -1 : 1;
        }
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        return aPrice - bPrice;
      });
    } else if (sort === "payment_high_low") {
      items.sort((a, b) => {
        const aHasMonthly = typeof a.monthly === "number";
        const bHasMonthly = typeof b.monthly === "number";
        if (aHasMonthly && bHasMonthly) {
          const aMonthly = a.monthly as number;
          const bMonthly = b.monthly as number;
          if (aMonthly !== bMonthly) return bMonthly - aMonthly;
        } else if (aHasMonthly !== bHasMonthly) {
          return aHasMonthly ? -1 : 1;
        }
        const aPrice = vehiclePrice(a, 0);
        const bPrice = vehiclePrice(b, 0);
        return bPrice - aPrice;
      });
    } else if (sort === "price_high_low") {
      items.sort((a, b) => vehiclePrice(b, 0) - vehiclePrice(a, 0));
    } else if (sort === "year_newest") {
      items.sort((a, b) => {
        const aYear = typeof a.year === "number" ? a.year : null;
        const bYear = typeof b.year === "number" ? b.year : null;
        if (aYear !== null && bYear !== null) {
          if (aYear !== bYear) return bYear - aYear;
        } else if (aYear !== bYear) {
          return aYear === null ? 1 : -1;
        }
        return byTextAsc(a.make, b.make) || byTextAsc(a.model, b.model);
      });
    } else if (sort === "year_oldest") {
      items.sort((a, b) => {
        const aYear = typeof a.year === "number" ? a.year : null;
        const bYear = typeof b.year === "number" ? b.year : null;
        if (aYear !== null && bYear !== null) {
          if (aYear !== bYear) return aYear - bYear;
        } else if (aYear !== bYear) {
          return aYear === null ? 1 : -1;
        }
        return byTextAsc(a.make, b.make) || byTextAsc(a.model, b.model);
      });
    } else if (sort === "make_a_z") {
      items.sort((a, b) => byTextAsc(a.make, b.make) || byTextAsc(a.model, b.model));
    } else if (sort === "make_z_a") {
      items.sort((a, b) => byTextAsc(b.make, a.make) || byTextAsc(b.model, a.model));
    } else if (sort === "model_a_z") {
      items.sort((a, b) => byTextAsc(a.model, b.model) || byTextAsc(a.make, b.make));
    } else if (sort === "model_z_a") {
      items.sort((a, b) => byTextAsc(b.model, a.model) || byTextAsc(b.make, a.make));
    }
    return items;
  }, [resultItems, sort]);
  const totalResults = resultsQuery.data?.total ?? resultItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const emptyStateMessage = useMemo(() => {
    const selection = [make, model].filter(Boolean).join(" ");
    if (selection) {
      return `No lease offers found for ${selection}. Try another model or clear make/model filters.`;
    }
    return "No matches yet. Try raising your payment target or clearing make/model.";
  }, [make, model]);
  const searchReturnUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const nextMake = searchParams.get("make") ?? "";
    const nextModel = searchParams.get("model") ?? "";
    const nextSort = searchParams.get("sort") ?? sortOptions[0].value;
    const nextMaxPayment = parsePositiveNumber(searchParams.get("max_payment"), defaultMaxPayment);
    const nextMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultMaxPrice);
    const nextPage = parsePositiveNumber(searchParams.get("page"), 1);

    setMake(nextMake);
    setModel(nextModel);
    setSort(nextSort);
    setMaxPayment(nextMaxPayment);
    setMaxPrice(nextMaxPrice);
    setPage(nextPage);
    setAppliedParams({
      vehicle_type: "new",
      offers_only: true,
      make: nextMake,
      model: nextModel,
      max_payment: nextMaxPayment,
      max_price: nextMaxPrice,
      sort: getBackendSort(nextSort),
      page: nextPage,
      page_size: pageSize
    });
  }, [searchParams]);

  function runSearch(
    nextPage = 1,
    overrides?: Partial<{
      make: string;
      model: string;
      sort: string;
      maxPayment: number;
      maxPrice: number;
    }>
  ) {
    const nextMake = overrides?.make ?? make;
    const nextModel = overrides?.model ?? model;
    const nextSort = overrides?.sort ?? sort;
    const nextMaxPayment = overrides?.maxPayment ?? maxPayment;
    const nextMaxPrice = overrides?.maxPrice ?? maxPrice;
    const query = new URLSearchParams();
    if (nextMake) query.set("make", nextMake);
    if (nextModel) query.set("model", nextModel);
    if (nextSort !== sortOptions[0].value) query.set("sort", nextSort);
    query.set("max_payment", String(nextMaxPayment));
    query.set("max_price", String(nextMaxPrice));
    query.set("page", String(nextPage));
    router.replace(`${pathname}?${query.toString()}`);
    setPage(nextPage);
    setAppliedParams({
      vehicle_type: "new",
      offers_only: true,
      make: nextMake,
      model: nextModel,
      max_payment: nextMaxPayment,
      max_price: nextMaxPrice,
      sort: getBackendSort(nextSort),
      page: nextPage,
      page_size: pageSize
    });
  }

  function handleMakeChange(nextMakeValue: string) {
    const nextMake = nextMakeValue === ANY_MAKE ? "" : nextMakeValue;
    if (nextMake === make) return;
    setMake(nextMake);
    setModel("");
  }

  function handleModelChange(nextModelValue: string) {
    const nextModel = nextModelValue === ANY_MODEL ? "" : nextModelValue;
    if (nextModel === model) return;
    setModel(nextModel);
  }

  useEffect(() => {
    if (filtersQuery.isLoading) return;

    let normalizedMake = make;
    let normalizedModel = model;

    if (normalizedMake && !makes.includes(normalizedMake)) {
      normalizedMake = "";
      normalizedModel = "";
    } else if (normalizedModel && !models.includes(normalizedModel)) {
      normalizedModel = "";
    }

    if (normalizedMake === make && normalizedModel === model) return;
    setMake(normalizedMake);
    setModel(normalizedModel);
    runSearch(1, { make: normalizedMake, model: normalizedModel });
  }, [filtersQuery.isLoading, makes, models, make, model]);

  function clearFilters() {
    setMake("");
    setModel("");
    setSort(sortOptions[0].value);
    setMaxPayment(defaultMaxPayment);
    setMaxPrice(defaultMaxPrice);
    setPage(1);
    router.replace(pathname);
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-4 sm:space-y-6">
        <section className="tc-fade-up w-full">
          <Tabs
            value={viewMode}
            onValueChange={(value) => {
              if (value === "all") {
                router.push("/search?vehicle_type=all");
                return;
              }
              router.push("/lease-specials");
            }}
          >
            <TabsList className="grid w-full grid-cols-2 bg-ink-100 p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger value="lease" className="w-full max-[420px]:px-2 max-[420px]:text-xs">Lease Specials</TabsTrigger>
              <TabsTrigger value="all" className="w-full max-[420px]:px-2 max-[420px]:text-xs">All Vehicles</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section className="tc-fade-up relative w-full overflow-hidden rounded-3xl border border-ink-200 bg-white px-4 pb-4 pt-4 shadow-sm sm:px-7 sm:pb-6 sm:pt-5">
          <div className="relative">
            <p className="market-kicker">New Cars Only</p>
            <h1 className="market-heading flex items-center gap-2 text-2xl sm:text-4xl">
              <CarFront className="h-7 w-7 text-brand-700" />
              Lease Specials
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm text-ink-600 sm:block">
              Live new-car inventory with real monthly lease offers. Use the narrow down menu to find your best deal fast.
            </p>
          </div>
        </section>

        <section className="sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMobileFiltersOpen(true)}>
                <SlidersHorizontal className="mr-1 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMobileSortOpen(true)}>
                <ArrowUpDown className="mr-1 h-4 w-4" />
                Sort by
              </Button>
            </div>
            <p className="text-sm text-ink-600">{totalResults.toLocaleString()} cars</p>
          </div>
          <Dialog open={mobileSortOpen} onOpenChange={setMobileSortOpen}>
            <DialogContent className="max-w-[320px] rounded-2xl p-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-brand-700" />
                  Sort by
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-2">
                {sortOptions.map((item) => (
                  <Button
                    key={item.value}
                    variant={sort === item.value ? "default" : "outline"}
                    className="w-full justify-start rounded-full"
                    onClick={() => {
                      setSort(item.value);
                      runSearch(1, { sort: item.value });
                      setMobileSortOpen(false);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DialogContent className="left-0 top-0 h-screen w-[88vw] max-w-[340px] translate-x-0 translate-y-0 rounded-none p-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                  Narrow down
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max monthly payment</Label>
                    <Badge>${maxPayment}/mo</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentPresets.map((value) => (
                      <Button key={value} variant="outline" size="sm" onClick={() => setMaxPayment(value)}>
                        Up to ${value}
                      </Button>
                    ))}
                  </div>
                  <Slider value={[maxPayment]} min={199} max={10000} step={25} onValueChange={(v) => setMaxPayment(v[0])} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max vehicle price</Label>
                    <Badge>${maxPrice.toLocaleString()}</Badge>
                  </div>
                  <Slider value={[maxPrice]} min={20000} max={1000000} step={500} onValueChange={(v) => setMaxPrice(v[0])} />
                </div>

                <div className="space-y-2">
                  <Label>Make</Label>
                  {makes.length > 0 ? (
                    <Select
                      value={make || ANY_MAKE}
                      onValueChange={handleMakeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any make" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_MAKE}>Any make</SelectItem>
                        {makes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={make} onChange={(event) => setMake(event.target.value)} placeholder="Toyota" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  {models.length > 0 ? (
                    <Select
                      value={model || ANY_MODEL}
                      onValueChange={handleModelChange}
                      disabled={!make}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={make ? `Any ${make} model` : "Select make first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_MODEL}>{make ? `Any ${make} model` : "Any model"}</SelectItem>
                        {models.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder={make ? `${make} model` : "Select make first"}
                      disabled={!make}
                    />
                  )}
                </div>

              <div className="space-y-2">
                  <Label>Sort by</Label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => {
                      runSearch(1);
                      setMobileFiltersOpen(false);
                    }}
                    className="flex-1 rounded-full"
                  >
                    <Search className="mr-1 h-4 w-4" />
                    See results
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearFilters();
                      setMobileFiltersOpen(false);
                    }}
                    className="rounded-full px-4"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="hidden border-ink-200 bg-white sm:block lg:sticky lg:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5 text-brand-700" />
              Narrow down
            </CardTitle>
            <p className="text-sm text-ink-600">Set your payment target, budget, and preferred make/model.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max monthly payment</Label>
                <Badge>${maxPayment}/mo</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {paymentPresets.map((value) => (
                  <Button key={value} variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setMaxPayment(value)}>
                    Up to ${value}
                  </Button>
                ))}
              </div>
              <Slider value={[maxPayment]} min={199} max={10000} step={25} onValueChange={(v) => setMaxPayment(v[0])} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max vehicle price</Label>
                <Badge>${maxPrice.toLocaleString()}</Badge>
              </div>
              <Slider value={[maxPrice]} min={20000} max={1000000} step={500} onValueChange={(v) => setMaxPrice(v[0])} />
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Make</Label>
                {makes.length > 0 ? (
                  <Select
                    value={make || ANY_MAKE}
                    onValueChange={handleMakeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any make" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_MAKE}>Any make</SelectItem>
                      {makes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={make} onChange={(event) => setMake(event.target.value)} placeholder="Toyota" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                {models.length > 0 ? (
                  <Select
                    value={model || ANY_MODEL}
                    onValueChange={handleModelChange}
                    disabled={!make}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={make ? `Any ${make} model` : "Select make first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_MODEL}>{make ? `Any ${make} model` : "Any model"}</SelectItem>
                      {models.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder={make ? `${make} model` : "Select make first"}
                    disabled={!make}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runSearch(1)} size="sm" className="rounded-full px-4">
                <Search className="mr-1 h-4 w-4" />
                Find my deals
              </Button>
              <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-full px-4">
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">

        {resultsQuery.isLoading && (
          <Card className="bg-white">
            <CardContent>
              <DealSearchLoader />
            </CardContent>
          </Card>
        )}

        {resultsQuery.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-3">
              <p className="flex items-center gap-1 text-sm font-medium text-ink-700">
                <CircleDollarSign className="h-4 w-4 text-brand-700" />
                {totalResults.toLocaleString()} matching new cars
              </p>
              <div className="hidden text-sm text-ink-500 sm:block">Monthly, down payment, and discounted offers updated from your offer sheet</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {resultItems.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  <CardContent className="py-10 text-center text-ink-500">
                    {emptyStateMessage}
                  </CardContent>
                </Card>
              )}
              {sortedResultItems.map((vehicle) => (
                <LeaseSpecialCard
                  key={vehicle.vin}
                  vehicle={vehicle}
                  returnUrl={searchReturnUrl}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-5">
              <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => runSearch(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => runSearch(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}

function LeaseSpecialCard({
  vehicle,
  returnUrl
}: {
  vehicle: Vehicle;
  returnUrl?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const primaryPrice = vehicle.discounted ?? vehicle.msrp ?? vehicle.listed_price ?? undefined;
  const detailsHref = `/vehicles/${encodeURIComponent(vehicle.vin)}`;
  const detailsActionHref = detailsHref;
  const fullName = `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.trim ?? ""}`.trim();
  const imageUrl = pickVehicleImage(vehicle);
  const checkAvailabilityHref = `/credit-application?vin=${encodeURIComponent(vehicle.vin)}&make=${encodeURIComponent(vehicle.make ?? "")}&model=${encodeURIComponent(vehicle.model ?? "")}&trim=${encodeURIComponent(vehicle.trim ?? "")}`;
  const leaseMeta: string[] = [];
  if (vehicle.term_months && vehicle.term_months > 0) leaseMeta.push(`${vehicle.term_months} mo`);
  if (vehicle.miles_per_year && vehicle.miles_per_year > 0) leaseMeta.push(`${vehicle.miles_per_year.toLocaleString()} mi/yr`);
  const leaseBase = vehicle.discounted ?? vehicle.msrp;
  const leasePaymentDisclosure =
    vehicle.monthly !== undefined
      ? leaseBase !== undefined
        ? `Lease payment is based on offer-sheet MSRP $${leaseBase.toLocaleString()}, not discounted price.`
        : "Lease payment is based on offer-sheet MSRP and lease structure, not discounted price."
      : null;

  const handleCheckAvailability = () => {
    if (!user) {
      toast({
        variant: "error",
        title: "Login to continue",
        description: "Please sign in to check availability."
      });
      const nextReturnUrl = returnUrl || "/lease-specials";
      router.push(`/login?returnUrl=${encodeURIComponent(nextReturnUrl)}`);
      return;
    }
    router.push(checkAvailabilityHref);
  };

  return (
    <Card className="search-card group overflow-hidden rounded-xl border border-ink-300 bg-[#f6f7f9] shadow-sm transition-[transform,box-shadow,border-color] duration-150 motion-safe:hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-ink-100">
          <Link href={detailsActionHref} aria-label={`View details for ${fullName}`}>
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                e.currentTarget.src = DEFAULT_CAR_IMAGE;
              }}
            />
          </Link>
          {vehicle.monthly !== undefined && vehicle.monthly !== null && (
            <div className="absolute bottom-2 left-2 rounded-full bg-emerald-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow sm:bottom-3 sm:left-3 sm:text-xs">
              ${vehicle.monthly.toLocaleString()}/mo
            </div>
          )}
        </div>

        <div className="space-y-2 px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5">
          <h3 className="line-clamp-1 font-display text-[14px] font-semibold text-ink-900 sm:text-base">
            <Link href={detailsActionHref} className="hover:underline">
              {fullName}
            </Link>
          </h3>

          <div className="border-t border-ink-300 pt-2">
            <div className="flex items-end justify-between gap-3">
              <p className="text-[22px] font-bold leading-none text-ink-900 max-[420px]:text-xl sm:text-xl">
                {primaryPrice !== undefined ? `$${primaryPrice.toLocaleString()}` : "Call for price"}
              </p>
              {vehicle.msrp !== undefined && <p className="hidden text-xs text-ink-700 sm:block">MSRP ${vehicle.msrp.toLocaleString()}</p>}
            </div>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 sm:text-xs">
              {vehicle.monthly !== undefined ? `$${vehicle.monthly.toLocaleString()}/mo lease` : "Monthly offer coming soon"}
              <Info className="h-4 w-4 text-ink-500" />
            </p>
            {leasePaymentDisclosure && <p className="mt-1 text-[11px] leading-snug text-ink-600">{leasePaymentDisclosure}</p>}
            {vehicle.down !== undefined && <p className="mt-1 text-xs text-ink-700">Down ${vehicle.down.toLocaleString()}</p>}
            {leaseMeta.length > 0 && <p className="mt-1 text-xs text-ink-700">{leaseMeta.join(" | ")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-ink-300 pt-2">
            <LeadFormButton
              size="sm"
              className="flex-1 rounded-full"
              vin={vehicle.vin}
              make={vehicle.make ?? ""}
              model={vehicle.model ?? ""}
              trim={vehicle.trim ?? ""}
              year={vehicle.year}
              source="lease_specials_get_price"
            >
                <span className="max-[420px]:hidden">Get Price</span>
                <span className="hidden max-[420px]:inline">Price</span>
            </LeadFormButton>
            <Button size="sm" variant="outline" className="rounded-full" onClick={handleCheckAvailability}>
              <span className="max-[420px]:hidden">Check availability</span>
              <span className="hidden max-[420px]:inline">Check</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
