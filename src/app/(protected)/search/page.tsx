"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type Vehicle } from "@/lib/api";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import LeadFormButton from "@/components/lead-form-button";
import Link from "next/link";
import { CarFront, CreditCard, Info, MessageSquare, MoreVertical, RotateCcw, Search as SearchIcon, SlidersHorizontal, Tag } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import DealSearchLoader from "@/components/deal-search-loader";

const sortOptions = [
  { value: "best_deal", label: "Best match" },
  { value: "newest", label: "Newest year first" },
  { value: "msrp_low_high", label: "Lowest price first" },
  { value: "price_high_low", label: "Highest price first" },
  { value: "score_high_low", label: "Top score" }
];

// Max monthly payment: $1–$2000 then Any (sentinel for API = no practical cap)
const PAYMENT_MIN = 1;
const PAYMENT_MAX = 2000;
/** Slider indices 0..PAYMENT_TICKS map ~$1 → $2000 */
const PAYMENT_TICKS = 79;
const PAYMENT_SLIDER_ANY = PAYMENT_TICKS + 1;
const PAYMENT_ANY_VALUE = 10000;

const defaultValues = {
  maxPrice: 100000,
  maxPayment: PAYMENT_ANY_VALUE,
  usedMaxPrice: 100000,
  maxMileage: 60000
};
const ANY_MAKE = "__any_make__";
const ANY_MODEL = "__any_model__";
const ANY_TRIM = "__any_trim__";

// Max vehicle price: 0–200k then Any
const PRICE_MIN = 0;
const PRICE_MAX = 200000;
const PRICE_STEP = 500; // matches the old slider step
const PRICE_TICKS = Math.round((PRICE_MAX - PRICE_MIN) / PRICE_STEP); // 0..400 = 0..200k
const PRICE_SLIDER_ANY = PRICE_TICKS + 1; // 401 = Any
const PRICE_ANY_VALUE = 999999;

function priceToSliderValue(price: number): number {
  if (price >= PRICE_ANY_VALUE) return PRICE_SLIDER_ANY;
  const clamped = Math.min(PRICE_MAX, Math.max(PRICE_MIN, price));
  return Math.round((clamped - PRICE_MIN) / PRICE_STEP);
}
function priceSliderToValue(sliderVal: number): number {
  if (sliderVal >= PRICE_SLIDER_ANY) return PRICE_ANY_VALUE;
  const normalized = Math.min(PRICE_TICKS, Math.max(0, Math.round(sliderVal)));
  return PRICE_MIN + normalized * PRICE_STEP;
}

function paymentToSliderValue(payment: number): number {
  if (payment >= PAYMENT_ANY_VALUE) return PAYMENT_SLIDER_ANY;
  const clamped = Math.min(PAYMENT_MAX, Math.max(PAYMENT_MIN, payment));
  return Math.round(((clamped - PAYMENT_MIN) / (PAYMENT_MAX - PAYMENT_MIN)) * PAYMENT_TICKS);
}
function paymentSliderToValue(sliderVal: number): number {
  if (sliderVal >= PAYMENT_SLIDER_ANY) return PAYMENT_ANY_VALUE;
  const normalized = Math.min(PAYMENT_TICKS, Math.max(0, Math.round(sliderVal)));
  return Math.round(PAYMENT_MIN + (normalized / PAYMENT_TICKS) * (PAYMENT_MAX - PAYMENT_MIN));
}

type VehicleTypeFilter = "new" | "used";

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseMaxPaymentFromSearchParam(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  if (parsed >= PAYMENT_ANY_VALUE) return PAYMENT_ANY_VALUE;
  // Legacy URLs used e.g. 650–10000; anything above $2000 means "no cap"
  if (parsed > PAYMENT_MAX) return PAYMENT_ANY_VALUE;
  return Math.max(PAYMENT_MIN, Math.round(parsed));
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageFallback() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main">
        <DealSearchLoader />
      </main>
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const queryVehicleType = searchParams.get("vehicle_type");
  const initialVehicleType: VehicleTypeFilter =
    queryVehicleType === "new" || queryVehicleType === "used" ? queryVehicleType : "new";
  const [vehicleType, setVehicleTypeState] = useState<VehicleTypeFilter>(initialVehicleType);
  const queryMode = searchParams.get("mode");
  const initialMode: "price" | "payment" =
    queryMode === "payment" ? "payment" : initialVehicleType === "new" ? "payment" : "price";
  const [mode, setMode] = useState<"price" | "payment">(initialMode);
  const [estimate, setEstimate] = useState(false);
  const [maxPrice, setMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultValues.maxPrice));
  const [maxPayment, setMaxPayment] = useState(parseMaxPaymentFromSearchParam(searchParams.get("max_payment"), defaultValues.maxPayment));
  const [usedMaxPrice, setUsedMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultValues.usedMaxPrice));
  const [maxMileage, setMaxMileage] = useState(parsePositiveNumber(searchParams.get("max_mileage"), defaultValues.maxMileage));
  const [make, setMake] = useState(searchParams.get("make") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [trim, setTrim] = useState(searchParams.get("trim") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? sortOptions[0].value);
  const [submitted, setSubmitted] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtersQuery = useQuery({
    queryKey: ["filters", "search", vehicleType],
    queryFn: () => api.getFilters({ vehicle_type: vehicleType }),
    enabled: true,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const sanitizeOptions = (items: string[] | undefined) =>
    Array.from(
      new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => !!item))
    );

  const params = useMemo(() => {
    return {
      vehicle_type: vehicleType,
      make,
      model,
      trim,
      sort,
      mode,
      max_price:
        vehicleType === "new"
          ? mode === "price"
            ? maxPrice
            : undefined
          : usedMaxPrice,
      max_payment: vehicleType === "new" && mode === "payment" ? maxPayment : undefined,
      max_mileage: vehicleType !== "new" ? maxMileage : undefined,
      estimate: vehicleType === "new" ? estimate : false,
      page,
      page_size: pageSize
    };
  }, [vehicleType, make, model, trim, sort, mode, maxPrice, maxPayment, usedMaxPrice, maxMileage, estimate, page]);
  const [appliedParams, setAppliedParams] = useState(params);

  const resultsQuery = useQuery({
    queryKey: ["search", appliedParams],
    queryFn: () => api.search(appliedParams),
    enabled: submitted,
    staleTime: 20_000,
    refetchOnWindowFocus: false
  });

  const makes = sanitizeOptions(filtersQuery.data?.makes);
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const trimsByMakeModel = filtersQuery.data?.trims_by_make_model ?? {};
  const models = useMemo(() => {
    if (!make) return sanitizeOptions(filtersQuery.data?.models);
    return sanitizeOptions(modelsByMake[make]);
  }, [make, modelsByMake, filtersQuery.data?.models]);
  const trims = useMemo(() => {
    if (!make || !model) return sanitizeOptions(filtersQuery.data?.trims);
    return sanitizeOptions(trimsByMakeModel[`${make}|||${model}`]);
  }, [make, model, trimsByMakeModel, filtersQuery.data?.trims]);
  const showUsedFilters = vehicleType === "used";
  const resultItems = resultsQuery.data?.results ?? [];
  const sortedResultItems = useMemo(() => {
    const items = [...resultItems];
    const byYearDesc = (a: Vehicle, b: Vehicle) => {
      const ay = typeof a.year === "number" ? a.year : null;
      const by = typeof b.year === "number" ? b.year : null;
      if (ay !== null && by !== null) {
        if (ay !== by) return by - ay;
      } else if (ay !== by) {
        return ay === null ? 1 : -1;
      }
      return 0;
    };
    const primaryPrice = (v: Vehicle) => {
      const normalizedType = (v.vehicle_type ?? "new").toString().toLowerCase();
      const normalizedCondition = (v.condition ?? "").toString().toLowerCase();
      const inferredType =
        normalizedCondition === "new"
          ? "new"
          : normalizedCondition === "used" || normalizedCondition === "cpo"
            ? "used"
            : normalizedType === "used"
              ? "used"
              : "new";
      if (inferredType === "used") {
        return v.listed_price ?? v.discounted ?? v.msrp ?? null;
      }
      return v.discounted ?? v.msrp ?? v.listed_price ?? null;
    };

    if (sort === "msrp_low_high") {
      items.sort((a, b) => {
        const ap = primaryPrice(a);
        const bp = primaryPrice(b);
        const aPrice = typeof ap === "number" ? ap : Number.MAX_SAFE_INTEGER;
        const bPrice = typeof bp === "number" ? bp : Number.MAX_SAFE_INTEGER;
        if (aPrice !== bPrice) return aPrice - bPrice;
        return byYearDesc(a, b);
      });
    } else if (sort === "newest") {
      items.sort((a, b) => {
        const primary = byYearDesc(a, b);
        if (primary !== 0) return primary;
        const ap = primaryPrice(a);
        const bp = primaryPrice(b);
        const aPrice = typeof ap === "number" ? ap : Number.MAX_SAFE_INTEGER;
        const bPrice = typeof bp === "number" ? bp : Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      });
    }

    // For "best_deal" and "score_high_low" we trust backend/api.search ordering.
    return items;
  }, [resultItems, sort]);
  const backendTotal = resultsQuery.data?.total;
  const totalResults = (() => {
    if (!resultsQuery.data) return 0;
    if (backendTotal == null) return sortedResultItems.length;
    // If we're on the first page, have fewer items than the page size,
    // and the backend total is larger than the items we actually received,
    // treat the real total as the items we have (avoid mismatched big counts like 3,497 vs 2 cards).
    if (page === 1 && sortedResultItems.length > 0 && sortedResultItems.length < pageSize && backendTotal > sortedResultItems.length) {
      return sortedResultItems.length;
    }
    return backendTotal;
  })();
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const searchReturnUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const isLoggedIn = !!user;
  const queryVehicleTypeForRedirect = searchParams.get("vehicle_type");
  const allowsGuestSearch =
    queryVehicleTypeForRedirect === "all" || queryVehicleTypeForRedirect === "used" || queryVehicleTypeForRedirect === "new";
  const topTabValue = "all";

  useEffect(() => {
    if (loading || user || allowsGuestSearch) return;
    const query = searchParams.toString();
    router.replace(query ? `/lease-specials?${query}` : "/lease-specials");
  }, [loading, user, allowsGuestSearch, searchParams, router]);

  useEffect(() => {
    const nextVehicleType = searchParams.get("vehicle_type") === "used" ? "used" : "new";
    const nextMode = searchParams.get("mode") === "payment" ? "payment" : "price";
    const nextPage = parsePositiveNumber(searchParams.get("page"), 1);
    const nextMake = searchParams.get("make") ?? "";
    const nextModel = searchParams.get("model") ?? "";
    const nextTrim = searchParams.get("trim") ?? "";
    const nextSort = searchParams.get("sort") ?? sortOptions[0].value;
    const nextEstimate = searchParams.get("estimate") === "true" || searchParams.get("estimate") === "1";
    const nextMaxMileage = parsePositiveNumber(searchParams.get("max_mileage"), defaultValues.maxMileage);
    const nextMaxPayment = parseMaxPaymentFromSearchParam(searchParams.get("max_payment"), defaultValues.maxPayment);
    const nextMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultValues.maxPrice);
    const nextUsedMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultValues.usedMaxPrice);

    setVehicleTypeState(nextVehicleType);
    setMode(nextMode);
    setMake(nextMake);
    setModel(nextModel);
    setTrim(nextTrim);
    setSort(nextSort);
    setEstimate(nextEstimate);
    setMaxMileage(nextMaxMileage);
    setMaxPayment(nextMaxPayment);
    setMaxPrice(nextMaxPrice);
    setUsedMaxPrice(nextUsedMaxPrice);
    setPage(nextPage);
    setAppliedParams({
      vehicle_type: nextVehicleType,
      make: nextMake,
      model: nextModel,
      trim: nextTrim,
      sort: nextSort,
      mode: nextMode,
      max_price:
        nextVehicleType === "new"
          ? nextMode === "price"
            ? nextMaxPrice
            : undefined
          : nextUsedMaxPrice,
      max_payment: nextVehicleType === "new" && nextMode === "payment" ? nextMaxPayment : undefined,
      max_mileage: nextVehicleType !== "new" ? nextMaxMileage : undefined,
      estimate: nextVehicleType === "new" ? nextEstimate : false,
      page: nextPage,
      page_size: pageSize
    });
    setSubmitted(true);
  }, [searchParams]);

  function setVehicleType(nextType: VehicleTypeFilter) {
    setVehicleTypeState(nextType);
    setModel("");
    setTrim("");
    setPage(1);
  }

  function runSearch(nextPage = 1) {
    const query = new URLSearchParams();
    query.set("vehicle_type", vehicleType);
    query.set("mode", mode);
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    if (trim) query.set("trim", trim);
    if (sort && sort !== sortOptions[0].value) query.set("sort", sort);
    if (vehicleType === "new" && mode === "payment") {
      query.set("max_payment", String(maxPayment));
      if (estimate) query.set("estimate", "true");
    } else {
      const selectedMaxPrice = vehicleType === "new" ? maxPrice : usedMaxPrice;
      query.set("max_price", String(selectedMaxPrice));
      if (vehicleType !== "new") {
        query.set("max_mileage", String(maxMileage));
      }
    }
    query.set("page", String(nextPage));
    router.replace(`${pathname}?${query.toString()}`);
    setPage(nextPage);
    setAppliedParams({
      ...params,
      page: nextPage
    });
    setSubmitted(true);
  }

  function clearFilters() {
    setMake("");
    setModel("");
    setTrim("");
    setSort(sortOptions[0].value);
    setMode("price");
    setEstimate(false);
    setMaxPrice(defaultValues.maxPrice);
    setMaxPayment(defaultValues.maxPayment);
    setUsedMaxPrice(defaultValues.usedMaxPrice);
    setMaxMileage(defaultValues.maxMileage);
    setPage(1);
    setSubmitted(true);
  }

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (make) chips.push({ key: "make", label: `Make: ${make}` });
    if (model) chips.push({ key: "model", label: `Model: ${model}` });
    if (trim) chips.push({ key: "trim", label: `Trim: ${trim}` });
    if (sort !== sortOptions[0].value) chips.push({ key: "sort", label: `Sort: ${sortOptions.find((s) => s.value === sort)?.label ?? sort}` });
    if (mode === "payment" && maxPayment !== defaultValues.maxPayment) {
      chips.push({
        key: "maxPayment",
        label: maxPayment >= PAYMENT_ANY_VALUE ? "Payment: Any" : `Payment <= $${maxPayment}/mo`
      });
    }
    if (mode === "price" && maxPrice !== defaultValues.maxPrice && vehicleType === "new") {
      chips.push({
        key: "maxPrice",
        label: maxPrice >= PRICE_ANY_VALUE ? "Price: Any" : `Price <= $${maxPrice.toLocaleString()}`
      });
    }
    if (vehicleType === "used" && usedMaxPrice !== defaultValues.usedMaxPrice) {
      chips.push({
        key: "usedMaxPrice",
        label: usedMaxPrice >= PRICE_ANY_VALUE ? "Used: Any" : `Used <= $${usedMaxPrice.toLocaleString()}`
      });
    }
    if (vehicleType === "used" && maxMileage !== defaultValues.maxMileage) {
      chips.push({ key: "maxMileage", label: `Mileage <= ${maxMileage.toLocaleString()}` });
    }
    return chips;
  }, [make, model, trim, sort, mode, maxPayment, maxPrice, usedMaxPrice, maxMileage, vehicleType]);

  function clearSingleFilter(key: string) {
    if (key === "make") {
      setMake("");
      setModel("");
      setTrim("");
    }
    if (key === "model") {
      setModel("");
      setTrim("");
    }
    if (key === "trim") setTrim("");
    if (key === "sort") setSort(sortOptions[0].value);
    if (key === "maxPayment") setMaxPayment(defaultValues.maxPayment);
    if (key === "maxPrice") setMaxPrice(defaultValues.maxPrice);
    if (key === "usedMaxPrice") setUsedMaxPrice(defaultValues.usedMaxPrice);
    if (key === "maxMileage") setMaxMileage(defaultValues.maxMileage);
  }

  const emptyMessage =
    vehicleType === "used"
      ? "No used cars match your filters. Try raising your max price, increasing max mileage, or clearing make/model."
      : vehicleType === "new"
        ? "No new cars match your filters. Try raising your payment or price target, or clearing make/model."
        : "No cars match your filters. Try clearing some filters or widening your budget.";

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-4 sm:space-y-8">
        <section className="tc-fade-up w-full">
          <Tabs
            value={topTabValue}
            onValueChange={(value) => {
              if (value === "lease") {
                router.push("/lease-specials");
                return;
              }
              router.push("/search?vehicle_type=new");
            }}
          >
            <TabsList className="grid w-full grid-cols-2 bg-ink-100 p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger value="lease" className="w-full max-[420px]:px-2 max-[420px]:text-xs">Lease Specials</TabsTrigger>
              <TabsTrigger value="all" className="w-full max-[420px]:px-2 max-[420px]:text-xs">All Vehicles</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section className="tc-fade-up relative w-full overflow-hidden rounded-3xl border border-ink-200 bg-white px-4 pb-4 pt-4 shadow-sm sm:px-7 sm:pb-6 sm:pt-5">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-50" aria-hidden />
          <div className="relative">
            <div>
              <p className="market-kicker">Marketplace Search</p>
              <h1 className="market-heading flex items-center gap-2 text-2xl sm:text-4xl">
                <CarFront className="h-7 w-7 text-brand-700" />
                Find your next car
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                {vehicleType === "used"
                  ? `Showing used cars${usedMaxPrice ? ` up to $${usedMaxPrice.toLocaleString()}` : ""}${
                      make ? `, ${make}` : ""
                    }${model ? ` ${model}` : ""}.`
                  : mode === "payment"
                    ? `Showing new cars with ${
                        maxPayment >= PAYMENT_ANY_VALUE ? "any monthly payment" : `payments up to $${maxPayment}/mo`
                      }${make ? `, ${make}` : ""}${model ? ` ${model}` : ""}.`
                    : `Showing new cars up to $${maxPrice.toLocaleString()}${
                        make ? `, ${make}` : ""
                      }${model ? ` ${model}` : ""}.`}
              </p>
            </div>
          </div>
        </section>

        <section className="sm:hidden">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal className="mr-1 h-4 w-4" />
              Filters
            </Button>
            <p className="text-sm text-ink-600">{totalResults.toLocaleString()} results</p>
          </div>
          <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DialogContent className="left-0 top-0 h-screen w-[88vw] max-w-[340px] translate-x-0 translate-y-0 rounded-none p-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                  Search filters
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <Tabs value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleTypeFilter)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-ink-100 p-1">
                    <TabsTrigger value="new">New</TabsTrigger>
                    <TabsTrigger value="used">Used</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={mode} onValueChange={(value) => setMode(value as "price" | "payment")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-ink-100 p-1">
                    <TabsTrigger value="price">By price</TabsTrigger>
                    <TabsTrigger value="payment">By payment</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2">
                  <Label>Make</Label>
                  {makes.length > 0 ? (
                    <Select
                      value={make || ANY_MAKE}
                      onValueChange={(nextMake) => {
                        if (nextMake === ANY_MAKE) {
                          setMake("");
                          setModel("");
                          setTrim("");
                          return;
                        }
                        if (nextMake !== make) {
                          setMake(nextMake);
                          setModel("");
                          setTrim("");
                        }
                      }}
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
                    <Input
                      value={make}
                      onChange={(event) => setMake(event.target.value)}
                      placeholder="Toyota"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                        setMobileFiltersOpen(false);
                      }}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  {models.length > 0 ? (
                    <Select
                      value={model || ANY_MODEL}
                      onValueChange={(nextModel) => {
                        if (nextModel === ANY_MODEL) {
                          setModel("");
                          setTrim("");
                          return;
                        }
                        setModel(nextModel);
                        setTrim("");
                      }}
                      disabled={!make}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={make ? "Any model" : "Select make first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_MODEL}>Any model</SelectItem>
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
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                        setMobileFiltersOpen(false);
                      }}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Trim</Label>
                  {trims.length > 0 ? (
                    <Select
                      value={trim || ANY_TRIM}
                      onValueChange={(nextTrim) => setTrim(nextTrim === ANY_TRIM ? "" : nextTrim)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any trim" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_TRIM}>Any trim</SelectItem>
                        {trims.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={trim}
                      onChange={(event) => setTrim(event.target.value)}
                      placeholder="XLE"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                        setMobileFiltersOpen(false);
                      }}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{mode === "payment" ? "Max payment" : "Max price"}</Label>
                    <Badge>
                      {mode === "payment"
                        ? maxPayment >= PAYMENT_ANY_VALUE
                          ? "Any"
                          : `$${maxPayment}/mo`
                        : (vehicleType === "new" ? maxPrice : usedMaxPrice) >= PRICE_ANY_VALUE
                          ? "Any"
                          : `$${(vehicleType === "new" ? maxPrice : usedMaxPrice).toLocaleString()}`}
                    </Badge>
                  </div>
                  {mode === "payment" ? (
                    <div className="space-y-2">
                      <Slider
                        value={[paymentToSliderValue(maxPayment)]}
                        min={0}
                        max={PAYMENT_SLIDER_ANY}
                        step={1}
                        onValueChange={(v) => setMaxPayment(paymentSliderToValue(v[0]))}
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">${PAYMENT_MIN}</span>
                        <span className="absolute right-0">${PAYMENT_MAX.toLocaleString()} / Any</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Slider
                        value={[priceToSliderValue(vehicleType === "new" ? maxPrice : usedMaxPrice)]}
                        min={0}
                        max={PRICE_SLIDER_ANY}
                        step={1}
                        onValueChange={(v) =>
                          vehicleType === "new"
                            ? setMaxPrice(priceSliderToValue(v[0]))
                            : setUsedMaxPrice(priceSliderToValue(v[0]))
                        }
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">$0</span>
                        <span className="absolute right-0">$200k / Any</span>
                      </div>
                    </div>
                  )}
                </div>
                {vehicleType === "new" && mode === "payment" && (
                  <div className="flex items-center gap-3">
                    <Switch checked={estimate} onCheckedChange={setEstimate} />
                    <span className="text-sm text-ink-600">Estimate payment using profile</span>
                  </div>
                )}
                {showUsedFilters && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Max mileage</Label>
                      <Badge>{maxMileage.toLocaleString()} mi</Badge>
                    </div>
                    <Slider value={[maxMileage]} min={0} max={250000} step={1000} onValueChange={(v) => setMaxMileage(v[0])} />
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => {
                    runSearch();
                    setMobileFiltersOpen(false);
                  }}
                  className="flex-1 rounded-full"
                >
                  <SearchIcon className="mr-1 h-4 w-4" />
                  Show results
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

        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="hidden border-ink-200 bg-white sm:block lg:sticky lg:top-16">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-5 w-5 text-brand-700" />
                Search filters
              </CardTitle>
              <p className="text-xs text-ink-600">Pick type, budget, and vehicle details.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleTypeFilter)} className="w-full">
                <TabsList className="grid h-10 w-full grid-cols-2 bg-ink-100 p-1">
                  <TabsTrigger value="new" className="px-3 py-1.5 text-xs">New</TabsTrigger>
                  <TabsTrigger value="used" className="px-3 py-1.5 text-xs">Used</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={mode} onValueChange={(value) => setMode(value as "price" | "payment")} className="w-full">
                <TabsList className="grid h-10 w-full grid-cols-2 bg-ink-100 p-1">
                  <TabsTrigger value="price" className="px-3 py-1.5 text-xs">By price</TabsTrigger>
                  <TabsTrigger value="payment" className="px-3 py-1.5 text-xs">By payment</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid gap-2">
                <div className="space-y-2">
                  <Label>Make</Label>
                  {makes.length > 0 ? (
                    <Select
                      value={make || ANY_MAKE}
                      onValueChange={(nextMake) => {
                        if (nextMake === ANY_MAKE) {
                          setMake("");
                          setModel("");
                          setTrim("");
                          return;
                        }
                        if (nextMake !== make) {
                          setMake(nextMake);
                          setModel("");
                          setTrim("");
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
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
                    <Input
                      className="h-10"
                      value={make}
                      onChange={(event) => setMake(event.target.value)}
                      placeholder="Toyota"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  {models.length > 0 ? (
                    <Select
                      value={model || ANY_MODEL}
                      onValueChange={(nextModel) => {
                        if (nextModel === ANY_MODEL) {
                          setModel("");
                          setTrim("");
                          return;
                        }
                        setModel(nextModel);
                        setTrim("");
                      }}
                      disabled={!make}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={make ? "Any model" : "Select make first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_MODEL}>Any model</SelectItem>
                        {models.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-10"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder={make ? "Camry" : "Select make first"}
                      disabled={!make}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Trim</Label>
                  {trims.length > 0 ? (
                    <Select
                      value={trim || ANY_TRIM}
                      onValueChange={(nextTrim) => setTrim(nextTrim === ANY_TRIM ? "" : nextTrim)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Any trim" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_TRIM}>Any trim</SelectItem>
                        {trims.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-10"
                      value={trim}
                      onChange={(event) => setTrim(event.target.value)}
                      placeholder="XLE"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch();
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-10">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{mode === "payment" ? "Max payment" : "Max price"}</Label>
                  <Badge>
                    {mode === "payment"
                      ? maxPayment >= PAYMENT_ANY_VALUE
                        ? "Any"
                        : `$${maxPayment}/mo`
                      : (vehicleType === "new" ? maxPrice : usedMaxPrice) >= PRICE_ANY_VALUE
                        ? "Any"
                        : `$${(vehicleType === "new" ? maxPrice : usedMaxPrice).toLocaleString()}`}
                  </Badge>
                </div>
                {mode === "payment" ? (
                  <div className="space-y-2">
                    <Slider
                      value={[paymentToSliderValue(maxPayment)]}
                      min={0}
                      max={PAYMENT_SLIDER_ANY}
                      step={1}
                      onValueChange={(v) => setMaxPayment(paymentSliderToValue(v[0]))}
                    />
                    <div className="relative h-4 text-[11px] text-ink-500">
                      <span className="absolute left-0">${PAYMENT_MIN}</span>
                      <span className="absolute right-0">${PAYMENT_MAX.toLocaleString()} / Any</span>
                    </div>
                  </div>
                ) : (
                    <div className="space-y-2">
                      <Slider
                        value={[priceToSliderValue(vehicleType === "new" ? maxPrice : usedMaxPrice)]}
                        min={0}
                        max={PRICE_SLIDER_ANY}
                        step={1}
                        onValueChange={(v) =>
                          vehicleType === "new"
                            ? setMaxPrice(priceSliderToValue(v[0]))
                            : setUsedMaxPrice(priceSliderToValue(v[0]))
                        }
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">$0</span>
                        <span className="absolute right-0">$200k / Any</span>
                      </div>
                    </div>
                )}
                <Input
                  className="h-10"
                  type="number"
                    value={
                      vehicleType === "new"
                        ? mode === "payment"
                          ? maxPayment >= PAYMENT_ANY_VALUE
                            ? PAYMENT_MAX
                            : maxPayment
                          : maxPrice >= PRICE_ANY_VALUE
                            ? PRICE_MAX
                            : maxPrice
                        : mode === "payment"
                          ? maxPayment >= PAYMENT_ANY_VALUE
                            ? PAYMENT_MAX
                            : maxPayment
                          : usedMaxPrice >= PRICE_ANY_VALUE
                            ? PRICE_MAX
                            : usedMaxPrice
                    }
                  onChange={(event) => {
                    if (mode === "payment") {
                      const raw = Number(event.target.value);
                      if (!Number.isFinite(raw) || raw <= 0) {
                        setMaxPayment(PAYMENT_MIN);
                      } else if (raw > PAYMENT_MAX) {
                        setMaxPayment(PAYMENT_ANY_VALUE);
                      } else {
                        setMaxPayment(Math.round(raw));
                      }
                    } else {
                      const nextValue = Math.min(PRICE_MAX, Math.max(0, Number(event.target.value) || 0));
                      if (vehicleType === "new") {
                        setMaxPrice(nextValue);
                      } else {
                        setUsedMaxPrice(nextValue);
                      }
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    runSearch();
                  }}
                />
              </div>

              {vehicleType === "new" && mode === "payment" && (
                <div className="flex items-center gap-3">
                  <Switch checked={estimate} onCheckedChange={setEstimate} />
                  <span className="text-xs text-ink-600">Estimate payment using profile</span>
                </div>
              )}

              {showUsedFilters && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max mileage</Label>
                    <Badge>{maxMileage.toLocaleString()} mi</Badge>
                  </div>
                  <Slider value={[maxMileage]} min={0} max={250000} step={1000} onValueChange={(v) => setMaxMileage(v[0])} />
                  <Input
                    className="h-10"
                    type="number"
                    value={maxMileage}
                    onChange={(event) => setMaxMileage(Math.max(0, Number(event.target.value) || 0))}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      runSearch();
                    }}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => runSearch()} size="sm" className="h-9 rounded-full px-4">
                  <SearchIcon className="mr-1 h-4 w-4" />
                  Show results
                </Button>
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 rounded-full px-4">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {activeFilters.length > 0 && (
              <Card className="bg-white">
                <CardContent className="flex flex-wrap gap-2 py-3">
                  {activeFilters.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => clearSingleFilter(chip.key)}
                      className="rounded-full border border-ink-300 bg-ink-50 px-3 py-1 text-xs text-ink-700 hover:bg-white"
                    >
                      {chip.label} x
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

        {submitted && resultsQuery.isLoading && (
          <Card className="tc-fade-up bg-white">
            <CardContent>
              <DealSearchLoader />
            </CardContent>
          </Card>
        )}

        {submitted && resultsQuery.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-4">
              <p className="text-sm font-medium text-ink-700">
                {totalResults.toLocaleString()} results
              </p>
              <nav
                className="flex items-center gap-2"
                aria-label="Pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSearch(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="min-w-[8rem] text-center text-sm text-ink-600" aria-live="polite">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSearch(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </nav>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sortedResultItems.length === 0 && (
                <Card className="bg-white sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                  <CardContent className="py-10 text-center text-ink-500">{emptyMessage}</CardContent>
                </Card>
              )}
              {sortedResultItems.map((vehicle) => (
                <VehicleCard key={vehicle.vin} vehicle={vehicle} isLoggedIn={isLoggedIn} searchReturnUrl={searchReturnUrl} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-200 pt-6">
              <p className="text-sm text-ink-500">
                {totalResults.toLocaleString()} results
              </p>
              <nav className="flex items-center gap-2" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSearch(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="min-w-[8rem] text-center text-sm text-ink-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSearch(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </nav>
            </div>
          </>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

function VehicleCard({
  vehicle,
  isLoggedIn,
  searchReturnUrl
}: {
  vehicle: Vehicle;
  isLoggedIn: boolean;
  searchReturnUrl: string;
}) {
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
    ? vehicle.listed_price ?? vehicle.discounted ?? vehicle.msrp ?? undefined
    : vehicle.discounted ?? vehicle.msrp ?? vehicle.listed_price ?? undefined;
  const msrpPrice = vehicle.msrp ?? undefined;
  const monthlyPrice = vehicle.monthly ?? undefined;
  const fullName = `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();
  const subtitle = `${vehicle.trim ?? "Trim unavailable"} | ${isUsed ? "Used car" : "New car"}`;
  const dealerName = vehicle.dealer_name ?? "Sponsored dealer";
  const imageUrl = pickVehicleImage(vehicle);
  const detailsHref = `/vehicles/${encodeURIComponent(vehicle.vin)}`;
  const unlockPriceHref = `/login?returnUrl=${encodeURIComponent(searchReturnUrl)}`;
  const detailsActionHref = detailsHref;
  const verifyAvailabilityHref = isLoggedIn
    ? `/credit-application?vin=${encodeURIComponent(vehicle.vin)}&make=${encodeURIComponent(vehicle.make ?? "")}&model=${encodeURIComponent(
      vehicle.model ?? ""
    )}&trim=${encodeURIComponent(vehicle.trim ?? "")}`
    : unlockPriceHref;
  const imageBadgeLeaseLabel = monthlyPrice !== undefined ? `$${monthlyPrice.toLocaleString()}/mo lease` : null;
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
          {imageBadgeLeaseLabel && (
            <div className="absolute bottom-3 right-3 hidden rounded-lg bg-white/95 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm sm:block">
              {imageBadgeLeaseLabel}
            </div>
          )}
        </div>

        <div className="space-y-2 px-3 pb-2.5 pt-3 sm:space-y-2.5 sm:px-3.5 sm:pb-3 sm:pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
                <h3 className="line-clamp-1 font-display text-[14px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-lg">
                  <Link href={detailsActionHref} className="hover:underline">
                    {fullName}
                  </Link>
                </h3>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-600 sm:text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  {subtitle}
                </p>
            </div>
            <button type="button" className="mt-1 hidden text-ink-500 hover:text-ink-700 sm:block" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="border-t border-ink-300 pt-3">
            <div className="flex items-end justify-between">
              <p className="text-[20px] font-bold leading-none text-ink-900 max-[420px]:text-lg sm:text-2xl">
                {isLoggedIn ? (primaryPrice !== undefined ? `$${primaryPrice.toLocaleString()}` : "Call for price") : "Login to unlock price"}
              </p>
              {isLoggedIn && !isUsed && msrpPrice !== undefined && (
                <p className="hidden text-xs text-ink-700 sm:block">MSRP ${msrpPrice.toLocaleString()}</p>
              )}
            </div>
            {!isLoggedIn && (
              <p className="mt-2 text-sm">
                <Link href={unlockPriceHref} className="font-medium text-brand-700 hover:text-brand-800">
                  Unlock full pricing
                </Link>
              </p>
            )}
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 sm:text-sm">
              {isLoggedIn
                ? monthlyPrice !== undefined
                  ? `$${monthlyPrice.toLocaleString()}/mo est.`
                  : "Payment estimate available"
                : "Sign in to unlock payment details"}
              <Info className="h-4 w-4 text-ink-500" />
            </p>
          </div>

          <div className="border-t border-ink-300 pt-3">
            <div className="hidden sm:block">
            {vehicle.dealer_phone ? (
              <a href={`tel:${vehicle.dealer_phone}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                {vehicle.dealer_phone}
              </a>
            ) : (
              <span className="text-sm font-medium text-brand-700">Contact dealer</span>
            )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LeadFormButton
                className="h-9 rounded-full px-3 text-xs font-semibold sm:px-4"
                vin={vehicle.vin}
                make={vehicle.make ?? ""}
                model={vehicle.model ?? ""}
                trim={vehicle.trim ?? ""}
                year={vehicle.year}
                source="search_get_price"
              >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  <span className="max-[420px]:hidden">Get Price</span>
                  <span className="hidden max-[420px]:inline">Price</span>
              </LeadFormButton>
              <Button asChild variant="outline" className="h-9 rounded-full border-ink-700 px-3 text-xs font-semibold sm:px-4">
                <Link href={verifyAvailabilityHref}>
                  <CreditCard className="mr-1 h-4 w-4" />
                  <span className="max-[420px]:hidden">More details</span>
                  <span className="hidden max-[420px]:inline">More details</span>
                </Link>
              </Button>
            </div>
          </div>

          <p className="hidden text-xs text-ink-600 sm:block">Sponsored by {dealerName}</p>
        </div>
      </CardContent>
    </Card>
  );
}
