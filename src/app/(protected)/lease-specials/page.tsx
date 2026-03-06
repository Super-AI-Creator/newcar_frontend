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
import { CarFront, CircleDollarSign, Info, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type Vehicle } from "@/lib/api";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import DealSearchLoader from "@/components/deal-search-loader";
import LeadFormButton from "@/components/lead-form-button";

const sortOptions = [
  { value: "payment_low_high", label: "Payment: Low to High" },
  { value: "msrp_low_high", label: "Price: Low to High" }
];

const paymentPresets = [399, 499, 599, 699, 799];
const defaultMaxPayment = 1499;
const defaultMaxPrice = 150000;
const pageSize = 12;

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  const [maxPayment, setMaxPayment] = useState(parsePositiveNumber(searchParams.get("max_payment"), defaultMaxPayment));
  const [maxPrice, setMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultMaxPrice));
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), 1));

  const filtersQuery = useQuery({
    queryKey: ["filters"],
    queryFn: api.getFilters,
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
      sort: sort === "payment_low_high" ? undefined : sort,
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
    if (sort === "payment_low_high") {
      items.sort((a, b) => {
        const aMonthly = typeof a.monthly === "number" ? a.monthly : Number.MAX_SAFE_INTEGER;
        const bMonthly = typeof b.monthly === "number" ? b.monthly : Number.MAX_SAFE_INTEGER;
        if (aMonthly !== bMonthly) return aMonthly - bMonthly;
        const aPrice = a.discounted ?? a.msrp ?? a.listed_price ?? Number.MAX_SAFE_INTEGER;
        const bPrice = b.discounted ?? b.msrp ?? b.listed_price ?? Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      });
    }
    return items;
  }, [resultItems, sort]);
  const totalResults = resultsQuery.data?.total ?? resultItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
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
      sort: nextSort === "payment_low_high" ? undefined : nextSort,
      page: nextPage,
      page_size: pageSize
    });
  }, [searchParams]);

  function runSearch(nextPage = 1) {
    const query = new URLSearchParams();
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    if (sort !== sortOptions[0].value) query.set("sort", sort);
    query.set("max_payment", String(maxPayment));
    query.set("max_price", String(maxPrice));
    query.set("page", String(nextPage));
    router.replace(`${pathname}?${query.toString()}`);
    setPage(nextPage);
    setAppliedParams({
      ...params,
      page: nextPage
    });
  }

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
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal className="mr-1 h-4 w-4" />
              Filters
            </Button>
            <p className="text-sm text-ink-600">{totalResults.toLocaleString()} cars</p>
          </div>
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
                  <Slider value={[maxPayment]} min={199} max={1499} step={25} onValueChange={(v) => setMaxPayment(v[0])} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max vehicle price</Label>
                    <Badge>${maxPrice.toLocaleString()}</Badge>
                  </div>
                  <Slider value={[maxPrice]} min={20000} max={150000} step={500} onValueChange={(v) => setMaxPrice(v[0])} />
                </div>

                <div className="space-y-2">
                  <Label>Make</Label>
                  {makes.length > 0 ? (
                    <Select value={make} onValueChange={(nextMake) => { setMake(nextMake); setModel(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any make" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <Select value={model} onValueChange={(nextModel) => setModel(nextModel)} disabled={!make}>
                      <SelectTrigger>
                        <SelectValue placeholder={make ? "Any model" : "Select make first"} />
                      </SelectTrigger>
                      <SelectContent>
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
                      placeholder={make ? "Camry" : "Select make first"}
                      disabled={!make}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sort</Label>
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
              <Slider value={[maxPayment]} min={199} max={1499} step={25} onValueChange={(v) => setMaxPayment(v[0])} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max vehicle price</Label>
                <Badge>${maxPrice.toLocaleString()}</Badge>
              </div>
              <Slider value={[maxPrice]} min={20000} max={150000} step={500} onValueChange={(v) => setMaxPrice(v[0])} />
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Make</Label>
                {makes.length > 0 ? (
                  <Select value={make} onValueChange={(nextMake) => { setMake(nextMake); setModel(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any make" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select value={model} onValueChange={(nextModel) => setModel(nextModel)} disabled={!make}>
                    <SelectTrigger>
                      <SelectValue placeholder={make ? "Any model" : "Select make first"} />
                    </SelectTrigger>
                    <SelectContent>
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
                    placeholder={make ? "Camry" : "Select make first"}
                    disabled={!make}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Ranking</Label>
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
                    No matches yet. Try raising your payment target or clearing make/model.
                  </CardContent>
                </Card>
              )}
              {sortedResultItems.map((vehicle) => (
                <LeaseSpecialCard
                  key={vehicle.vin}
                  vehicle={vehicle}
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
  vehicle
}: {
  vehicle: Vehicle;
}) {
  const primaryPrice = vehicle.discounted ?? vehicle.msrp ?? vehicle.listed_price ?? undefined;
  const detailsHref = `/vehicles/${encodeURIComponent(vehicle.vin)}`;
  const detailsActionHref = detailsHref;
  const fullName = `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.trim ?? ""}`.trim();
  const imageUrl = pickVehicleImage(vehicle);
  const leaseMeta: string[] = [];
  if (vehicle.term_months && vehicle.term_months > 0) leaseMeta.push(`${vehicle.term_months} mo`);
  if (vehicle.miles_per_year && vehicle.miles_per_year > 0) leaseMeta.push(`${vehicle.miles_per_year.toLocaleString()} mi/yr`);

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
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link
                href={`/credit-application?vin=${encodeURIComponent(vehicle.vin)}&make=${encodeURIComponent(vehicle.make ?? "")}&model=${encodeURIComponent(vehicle.model ?? "")}&trim=${encodeURIComponent(vehicle.trim ?? "")}`}
              >
                <span className="max-[420px]:hidden">Verify Availability</span>
                <span className="hidden max-[420px]:inline">Verify</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
