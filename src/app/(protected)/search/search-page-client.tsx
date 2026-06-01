"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import MarketplaceStickyHeader from "@/components/marketplace-sticky-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type Vehicle } from "@/lib/api";
import { firstDisplayPrice, resolveSearchCardPrimaryPrice, displayPrice } from "@/lib/vehicle-pricing";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import LeadFormButton from "@/components/lead-form-button";
import Link from "next/link";
import { CarFront, CreditCard, Info, MessageSquare, MoreVertical, RotateCcw, Search as SearchIcon, SlidersHorizontal, Tag } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import DealSearchLoader from "@/components/deal-search-loader";
import MarketplaceLeaseFinanceTabs from "@/components/marketplace-lease-finance-tabs";
import { inferVehicleListingType } from "@/lib/vehicle-listing-type";

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
const DEFAULT_FINANCE_TERM_MONTHS = 72;
const DEFAULT_FINANCE_APR = 6.99;
const TERM_MIN = 24;
const TERM_MAX = 84;
const TERM_STEP = 12;
const DOWN_PAYMENT_MIN = 0;
const DOWN_PAYMENT_MAX = 50000;
const DOWN_PAYMENT_STEP = 500;
const APR_MIN = 0;
const APR_MAX = 15;
const APR_STEP = 0.05;

// Max vehicle price: 0–200k then Any
const PRICE_MIN = 0;
const PRICE_MAX = 200000;
const PRICE_STEP = 500; // matches the old slider step
const PRICE_TICKS = Math.round((PRICE_MAX - PRICE_MIN) / PRICE_STEP); // 0..400 = 0..200k
const PRICE_SLIDER_ANY = PRICE_TICKS + 1; // 401 = Any
const PRICE_ANY_VALUE = 999999;

const defaultValues = {
  maxPrice: PRICE_ANY_VALUE,
  maxPayment: PAYMENT_ANY_VALUE,
  downPayment: 0,
  termMonths: DEFAULT_FINANCE_TERM_MONTHS,
  apr: DEFAULT_FINANCE_APR,
  usedMaxPrice: PRICE_ANY_VALUE,
  maxMileage: 60000
};
const ANY_MAKE = "__any_make__";
const ANY_MODEL = "__any_model__";
const ANY_TRIM = "__any_trim__";
const ANY_YEAR = "__any_year__";

function parseYearParam(value: string | null): string {
  if (value == null || !value.trim()) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(Math.trunc(parsed)) : "";
}

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

function parseNonNegativeNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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
  const [maxPrice, setMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultValues.maxPrice));
  const [maxPayment, setMaxPayment] = useState(parseMaxPaymentFromSearchParam(searchParams.get("max_payment"), defaultValues.maxPayment));
  const [downPayment, setDownPayment] = useState(parseNonNegativeNumber(searchParams.get("down_payment"), defaultValues.downPayment));
  const [termMonths, setTermMonths] = useState(parsePositiveNumber(searchParams.get("term_months"), defaultValues.termMonths));
  const [apr, setApr] = useState(parseNonNegativeNumber(searchParams.get("apr"), defaultValues.apr));
  const [usedMaxPrice, setUsedMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultValues.usedMaxPrice));
  const [maxMileage, setMaxMileage] = useState(parsePositiveNumber(searchParams.get("max_mileage"), defaultValues.maxMileage));
  const [make, setMake] = useState(searchParams.get("make") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [trim, setTrim] = useState(searchParams.get("trim") ?? "");
  const [yearFilter, setYearFilter] = useState(parseYearParam(searchParams.get("year")));
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
      max_payment:
        vehicleType === "new" && mode === "payment" && maxPayment < PAYMENT_ANY_VALUE ? maxPayment : undefined,
      down_payment: vehicleType === "new" && mode === "payment" ? downPayment : undefined,
      apr: vehicleType === "new" && mode === "payment" ? apr : undefined,
      term_months: vehicleType === "new" && mode === "payment" ? termMonths : undefined,
      max_mileage: vehicleType !== "new" ? maxMileage : undefined,
      year: vehicleType === "used" && yearFilter ? Number(yearFilter) : undefined,
      page,
      page_size: pageSize
    };
  }, [vehicleType, make, model, trim, yearFilter, sort, mode, maxPrice, maxPayment, downPayment, termMonths, apr, usedMaxPrice, maxMileage, page]);
  const [appliedParams, setAppliedParams] = useState(params);

  const resultsQuery = useQuery({
    queryKey: ["search", appliedParams],
    queryFn: () => api.search(appliedParams),
    enabled: submitted,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 400
  });

  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const makes = useMemo(() => {
    const rawMakes = sanitizeOptions(filtersQuery.data?.makes);
    const keyedMakes = sanitizeOptions(Object.keys(modelsByMake));
    // Prefer canonical keys from models_by_make when available because some feeds
    // occasionally leak model values into the top-level makes array.
    return (keyedMakes.length > 0 ? keyedMakes : rawMakes).sort((a, b) => a.localeCompare(b));
  }, [filtersQuery.data?.makes, modelsByMake]);
  const trimsByMakeModel = filtersQuery.data?.trims_by_make_model ?? {};
  const models = useMemo(() => {
    if (!make) return [];
    const candidateModels = sanitizeOptions(modelsByMake[make]);
    if (candidateModels.length === 0) return candidateModels;
    const makeNames = new Set(makes.map((item) => item.trim().toLowerCase()));
    // Defensive cleanup: some feeds leak make names into model lists.
    return candidateModels.filter((item) => {
      const normalized = item.trim().toLowerCase();
      return !makeNames.has(normalized);
    });
  }, [make, makes, modelsByMake]);
  const trims = useMemo(() => {
    if (!make || !model) return [];
    return sanitizeOptions(trimsByMakeModel[`${make}|||${model}`]);
  }, [make, model, trimsByMakeModel]);
  const yearsByMake = filtersQuery.data?.years_by_make ?? {};
  const years = useMemo(() => {
    if (vehicleType !== "used") return [];
    const rawYears =
      make && yearsByMake[make]?.length ? yearsByMake[make] : (filtersQuery.data?.years ?? []);
    return Array.from(new Set(rawYears.map((year) => String(year))))
      .filter((year) => year.trim().length > 0)
      .sort((a, b) => Number(b) - Number(a));
  }, [vehicleType, make, yearsByMake, filtersQuery.data?.years]);
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
      const inferredType = inferVehicleListingType(v);
      if (inferredType === "used") {
        return firstDisplayPrice(v.listed_price, v.discounted, v.msrp) ?? null;
      }
      return firstDisplayPrice(v.discounted, v.msrp, v.listed_price) ?? null;
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
  const cuReferralSlug = (searchParams.get("cu") ?? "").trim();
  const searchShellHeader = cuReferralSlug ? (
    <MarketplaceStickyHeader cuSlug={cuReferralSlug} />
  ) : (
    <SiteHeader />
  );
  const resultsCountLabel =
    submitted && resultsQuery.isError
      ? "—"
      : submitted && !resultsQuery.data && (resultsQuery.isPending || resultsQuery.isFetching)
        ? "Loading…"
        : `${totalResults.toLocaleString()} results`;
  const queryVehicleTypeForRedirect = searchParams.get("vehicle_type");
  const allowsGuestSearch =
    queryVehicleTypeForRedirect === "all" || queryVehicleTypeForRedirect === "used" || queryVehicleTypeForRedirect === "new";

  useEffect(() => {
    const nextVehicleType = searchParams.get("vehicle_type") === "used" ? "used" : "new";
    const nextMode = searchParams.get("mode") === "payment" ? "payment" : "price";
    const nextPage = parsePositiveNumber(searchParams.get("page"), 1);
    const nextMake = searchParams.get("make") ?? "";
    const nextModel = searchParams.get("model") ?? "";
    const nextTrim = searchParams.get("trim") ?? "";
    const nextYear = parseYearParam(searchParams.get("year"));
    const nextSort = searchParams.get("sort") ?? sortOptions[0].value;
    const nextMaxMileage = parsePositiveNumber(searchParams.get("max_mileage"), defaultValues.maxMileage);
    const nextMaxPayment = parseMaxPaymentFromSearchParam(searchParams.get("max_payment"), defaultValues.maxPayment);
    const nextDownPayment = parseNonNegativeNumber(searchParams.get("down_payment"), defaultValues.downPayment);
    const nextTermMonths = parsePositiveNumber(searchParams.get("term_months"), defaultValues.termMonths);
    const nextApr = parseNonNegativeNumber(searchParams.get("apr"), defaultValues.apr);
    const nextMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultValues.maxPrice);
    const nextUsedMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultValues.usedMaxPrice);

    setVehicleTypeState(nextVehicleType);
    setMode(nextMode);
    setMake(nextMake);
    setModel(nextModel);
    setTrim(nextTrim);
    setYearFilter(nextYear);
    setSort(nextSort);
    setMaxMileage(nextMaxMileage);
    setMaxPayment(nextMaxPayment);
    setDownPayment(nextDownPayment);
    setTermMonths(nextTermMonths);
    setApr(nextApr);
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
      max_payment:
        nextVehicleType === "new" && nextMode === "payment" && nextMaxPayment < PAYMENT_ANY_VALUE
          ? nextMaxPayment
          : undefined,
      down_payment: nextVehicleType === "new" && nextMode === "payment" ? nextDownPayment : undefined,
      term_months: nextVehicleType === "new" && nextMode === "payment" ? nextTermMonths : undefined,
      apr: nextVehicleType === "new" && nextMode === "payment" ? nextApr : undefined,
      max_mileage: nextVehicleType !== "new" ? nextMaxMileage : undefined,
      year: nextVehicleType === "used" && nextYear ? Number(nextYear) : undefined,
      page: nextPage,
      page_size: pageSize
    });
    setSubmitted(true);
  }, [searchParams]);

  function setVehicleType(nextType: VehicleTypeFilter) {
    if (nextType === vehicleType) return;
    setVehicleTypeState(nextType);
    setModel("");
    setTrim("");
    setYearFilter("");
    setPage(1);
    const nextMode = nextType === "used" ? "price" : mode;
    if (nextMode !== mode) {
      setMode(nextMode);
    }
    runSearch(1, {
      vehicleType: nextType,
      mode: nextMode,
      model: "",
      trim: "",
      year: ""
    });
  }

  function setSearchMode(nextMode: "price" | "payment") {
    if (nextMode === mode) return;
    setMode(nextMode);
    runSearch(1, { mode: nextMode });
  }

  function handleMakeChange(nextMakeValue: string) {
    const nextMake = nextMakeValue === ANY_MAKE ? "" : nextMakeValue;
    if (nextMake === make) return;
    setMake(nextMake);
    setModel("");
    setTrim("");
    setYearFilter("");
    runSearch(1, { make: nextMake, model: "", trim: "", year: "" });
  }

  function handleModelChange(nextModelValue: string) {
    const nextModel = nextModelValue === ANY_MODEL ? "" : nextModelValue;
    if (nextModel === model) return;
    setModel(nextModel);
    setTrim("");
    runSearch(1, { model: nextModel, trim: "" });
  }

  function handleYearChange(nextYearValue: string) {
    const nextYear = nextYearValue === ANY_YEAR ? "" : nextYearValue;
    if (nextYear === yearFilter) return;
    setYearFilter(nextYear);
    runSearch(1, { year: nextYear });
  }

  function handleTrimChange(nextTrimValue: string) {
    const nextTrim = nextTrimValue === ANY_TRIM ? "" : nextTrimValue;
    if (nextTrim === trim) return;
    setTrim(nextTrim);
    runSearch(1, { trim: nextTrim });
  }

  useEffect(() => {
    if (filtersQuery.isLoading) return;

    let normalizedMake = make;
    let normalizedModel = model;
    let normalizedTrim = trim;
    let normalizedYear = yearFilter;

    if (normalizedMake && !makes.includes(normalizedMake)) {
      normalizedMake = "";
      normalizedModel = "";
      normalizedTrim = "";
      normalizedYear = "";
    } else if (normalizedModel && !models.includes(normalizedModel)) {
      normalizedModel = "";
      normalizedTrim = "";
    } else if (normalizedTrim && !trims.includes(normalizedTrim)) {
      normalizedTrim = "";
    } else if (vehicleType === "used" && normalizedYear && !years.includes(normalizedYear)) {
      normalizedYear = "";
    }

    if (
      normalizedMake === make &&
      normalizedModel === model &&
      normalizedTrim === trim &&
      normalizedYear === yearFilter
    ) {
      return;
    }
    setMake(normalizedMake);
    setModel(normalizedModel);
    setTrim(normalizedTrim);
    setYearFilter(normalizedYear);
    runSearch(1, {
      make: normalizedMake,
      model: normalizedModel,
      trim: normalizedTrim,
      year: normalizedYear
    });
  }, [filtersQuery.isLoading, makes, models, trims, years, vehicleType, make, model, trim, yearFilter]);

  function runSearch(
    nextPage = 1,
    overrides?: Partial<{
      vehicleType: VehicleTypeFilter;
      mode: "price" | "payment";
      make: string;
      model: string;
      trim: string;
      year: string;
      sort: string;
      maxPayment: number;
      downPayment: number;
      termMonths: number;
      apr: number;
      maxPrice: number;
      usedMaxPrice: number;
      maxMileage: number;
    }>
  ) {
    const nextVehicleType = overrides?.vehicleType !== undefined ? overrides.vehicleType : vehicleType;
    const nextMode = overrides?.mode !== undefined ? overrides.mode : mode;
    const nextMake = overrides?.make !== undefined ? overrides.make : make;
    const nextModel = overrides?.model !== undefined ? overrides.model : model;
    const nextTrim = overrides?.trim !== undefined ? overrides.trim : trim;
    const nextYear = overrides?.year !== undefined ? overrides.year : yearFilter;
    const nextSort = overrides?.sort !== undefined ? overrides.sort : sort;
    const nextMaxPayment = overrides?.maxPayment !== undefined ? overrides.maxPayment : maxPayment;
    const nextDownPayment = overrides?.downPayment !== undefined ? overrides.downPayment : downPayment;
    const nextTermMonths = overrides?.termMonths !== undefined ? overrides.termMonths : termMonths;
    const nextApr = overrides?.apr !== undefined ? overrides.apr : apr;
    const nextMaxPrice = overrides?.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
    const nextUsedMaxPrice = overrides?.usedMaxPrice !== undefined ? overrides.usedMaxPrice : usedMaxPrice;
    const nextMaxMileage = overrides?.maxMileage !== undefined ? overrides.maxMileage : maxMileage;

    const query = new URLSearchParams();
    query.set("vehicle_type", nextVehicleType);
    query.set("mode", nextMode);
    if (nextMake) query.set("make", nextMake);
    if (nextModel) query.set("model", nextModel);
    if (nextTrim) query.set("trim", nextTrim);
    if (nextVehicleType === "used" && nextYear) query.set("year", nextYear);
    if (nextSort && nextSort !== sortOptions[0].value) query.set("sort", nextSort);
    if (nextVehicleType === "new" && nextMode === "payment") {
      if (nextMaxPayment < PAYMENT_ANY_VALUE) {
        query.set("max_payment", String(nextMaxPayment));
      }
      query.set("down_payment", String(nextDownPayment));
      query.set("term_months", String(nextTermMonths));
      query.set("apr", String(nextApr));
    } else {
      const selectedMaxPrice = nextVehicleType === "new" ? nextMaxPrice : nextUsedMaxPrice;
      query.set("max_price", String(selectedMaxPrice));
      if (nextVehicleType !== "new") {
        query.set("max_mileage", String(nextMaxMileage));
      }
    }
    query.set("page", String(nextPage));
    const cuKeep = (searchParams.get("cu") ?? "").trim();
    if (cuKeep) query.set("cu", cuKeep);
    const searchModeKeep = (searchParams.get("search_mode") ?? "").trim();
    if (searchModeKeep) query.set("search_mode", searchModeKeep);
    router.replace(`${pathname}?${query.toString()}`);
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
      max_payment:
        nextVehicleType === "new" && nextMode === "payment" && nextMaxPayment < PAYMENT_ANY_VALUE
          ? nextMaxPayment
          : undefined,
      down_payment: nextVehicleType === "new" && nextMode === "payment" ? nextDownPayment : undefined,
      term_months: nextVehicleType === "new" && nextMode === "payment" ? nextTermMonths : undefined,
      apr: nextVehicleType === "new" && nextMode === "payment" ? nextApr : undefined,
      max_mileage: nextVehicleType !== "new" ? nextMaxMileage : undefined,
      year: nextVehicleType === "used" && nextYear ? Number(nextYear) : undefined,
      page: nextPage,
      page_size: pageSize
    });
    setSubmitted(true);

    if (overrides) {
      if (overrides.vehicleType !== undefined) setVehicleTypeState(overrides.vehicleType);
      if (overrides.mode !== undefined) setMode(overrides.mode);
      if (overrides.make !== undefined) setMake(overrides.make);
      if (overrides.model !== undefined) setModel(overrides.model);
      if (overrides.trim !== undefined) setTrim(overrides.trim);
      if (overrides.year !== undefined) setYearFilter(overrides.year);
      if (overrides.sort !== undefined) setSort(overrides.sort);
      if (overrides.maxPayment !== undefined) setMaxPayment(overrides.maxPayment);
      if (overrides.downPayment !== undefined) setDownPayment(overrides.downPayment);
      if (overrides.termMonths !== undefined) setTermMonths(overrides.termMonths);
      if (overrides.apr !== undefined) setApr(overrides.apr);
      if (overrides.maxPrice !== undefined) setMaxPrice(overrides.maxPrice);
      if (overrides.usedMaxPrice !== undefined) setUsedMaxPrice(overrides.usedMaxPrice);
      if (overrides.maxMileage !== undefined) setMaxMileage(overrides.maxMileage);
    }
  }

  function clearFilters() {
    setMake("");
    setModel("");
    setTrim("");
    setYearFilter("");
    setSort(sortOptions[0].value);
    setMaxPrice(defaultValues.maxPrice);
    setMaxPayment(defaultValues.maxPayment);
    setDownPayment(defaultValues.downPayment);
    setTermMonths(defaultValues.termMonths);
    setApr(defaultValues.apr);
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
    if (vehicleType === "used" && yearFilter) chips.push({ key: "year", label: `Year: ${yearFilter}` });
    if (sort !== sortOptions[0].value) chips.push({ key: "sort", label: `Sort: ${sortOptions.find((s) => s.value === sort)?.label ?? sort}` });
    if (mode === "payment" && maxPayment !== defaultValues.maxPayment) {
      chips.push({
        key: "maxPayment",
        label: maxPayment >= PAYMENT_ANY_VALUE ? "Payment: Any" : `Payment <= $${maxPayment}/mo`
      });
    }
    if (vehicleType === "new" && mode === "payment" && downPayment !== defaultValues.downPayment) {
      chips.push({ key: "downPayment", label: `Down payment: $${downPayment.toLocaleString()}` });
    }
    if (vehicleType === "new" && mode === "payment" && termMonths !== defaultValues.termMonths) {
      chips.push({ key: "termMonths", label: `Term: ${termMonths} months` });
    }
    if (vehicleType === "new" && mode === "payment" && Math.abs(apr - defaultValues.apr) > 0.001) {
      chips.push({ key: "apr", label: `APR: ${apr.toFixed(2)}%` });
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
  }, [make, model, trim, yearFilter, sort, mode, maxPayment, downPayment, termMonths, apr, maxPrice, usedMaxPrice, maxMileage, vehicleType]);

  function clearSingleFilter(key: string) {
    if (key === "make") {
      runSearch(1, { make: "", model: "", trim: "", year: "" });
      return;
    }
    if (key === "model") {
      runSearch(1, { model: "", trim: "" });
      return;
    }
    if (key === "trim") {
      runSearch(1, { trim: "" });
      return;
    }
    if (key === "year") {
      runSearch(1, { year: "" });
      return;
    }
    if (key === "sort") {
      runSearch(1, { sort: sortOptions[0].value });
      return;
    }
    if (key === "maxPayment") {
      runSearch(1, { maxPayment: defaultValues.maxPayment });
      return;
    }
    if (key === "downPayment") {
      runSearch(1, { downPayment: defaultValues.downPayment });
      return;
    }
    if (key === "termMonths") {
      runSearch(1, { termMonths: defaultValues.termMonths });
      return;
    }
    if (key === "apr") {
      runSearch(1, { apr: defaultValues.apr });
      return;
    }
    if (key === "maxPrice") {
      runSearch(1, { maxPrice: defaultValues.maxPrice });
      return;
    }
    if (key === "usedMaxPrice") {
      runSearch(1, { usedMaxPrice: defaultValues.usedMaxPrice });
      return;
    }
    if (key === "maxMileage") {
      runSearch(1, { maxMileage: defaultValues.maxMileage });
    }
  }

  const emptyMessage =
    vehicleType === "used"
      ? "No used cars match your filters. Try raising your max price, increasing max mileage, or clearing make/model."
      : vehicleType === "new"
        ? "No new cars match your filters. Try raising your payment or price target, or clearing make/model."
        : "No cars match your filters. Try clearing some filters or widening your budget.";

  if (!loading && !user && !allowsGuestSearch) {
    const leaseHref = searchParams.toString() ? `/lease-specials?${searchParams.toString()}` : "/lease-specials";
    return (
      <div className="app-page min-h-screen">
        {searchShellHeader}
        <main className="app-main space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 sm:px-6 sm:py-5">
            <h1 className="text-lg font-semibold text-ink-900 sm:text-xl">Sign in to search all inventory</h1>
            <p className="mt-2 text-sm text-ink-700">
              Full marketplace search is available to signed-in members. You can still browse lease specials or narrow new/used inventory
              using the shortcuts below — no account required for those paths.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" onClick={() => router.push("/search?vehicle_type=new")}>
                Browse new cars
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/search?vehicle_type=used")}>
                Browse used cars
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push(leaseHref)}>
                Continue to lease specials
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/login?returnUrl=%2Fsearch%3Fvehicle_type%3Dnew">Sign in</Link>
              </Button>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      {searchShellHeader}
      <main className="app-main space-y-4 sm:space-y-8">
        <section className="tc-fade-up lux-overlay relative w-full overflow-hidden rounded-3xl border border-ink-200/80 bg-white/95 px-4 pb-4 pt-4 shadow-luxe-soft sm:px-7 sm:pb-6 sm:pt-5">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-50" aria-hidden />
          <img
            src="/images/ribon.png"
            alt="A vibrant red satin ribbon bow tied diagonally across."
            className="pointer-events-none absolute m-0 p-0 right-0 top-0 w-64 max-w-none translate-x-[16%] -translate-y-[14%] opacity-95 sm:w-80 sm:translate-x-[18%] sm:-translate-y-[16%]"
          />
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
            <Button
              variant="outline"
              size="sm"
              className="relative rounded-full"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" />
              Filters
              {activeFilters.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
                  {activeFilters.length > 9 ? "9+" : activeFilters.length}
                </span>
              ) : null}
            </Button>
            <p className="text-sm text-ink-600">{resultsCountLabel}</p>
          </div>
          <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-[min(88vw,340px)] max-w-[340px] translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-r border-ink-200 p-0 shadow-xl">
              <DialogHeader className="shrink-0 border-b border-ink-200 px-4 pb-3 pr-12 pt-10">
                <DialogTitle className="flex items-center gap-2 text-left">
                  <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                  Search filters
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch]">
                <div className="space-y-4 pb-2">
                <Tabs value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleTypeFilter)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-ink-100 p-1">
                    <TabsTrigger value="new">New</TabsTrigger>
                    <TabsTrigger value="used">Used</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={mode} onValueChange={(value) => setSearchMode(value as "price" | "payment")} className="w-full">
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
                      onValueChange={handleModelChange}
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
                {showUsedFilters && (
                  <div className="space-y-2">
                    <Label>Year</Label>
                    {years.length > 0 ? (
                      <Select value={yearFilter || ANY_YEAR} onValueChange={handleYearChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_YEAR}>Any year</SelectItem>
                          {years.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={yearFilter} placeholder="Any year" disabled />
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Trim</Label>
                  {trims.length > 0 ? (
                    <Select
                      value={trim || ANY_TRIM}
                      onValueChange={handleTrimChange}
                      disabled={!make || !model}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={make && model ? "Any trim" : "Select model first"} />
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
                      placeholder={make && model ? "XLE" : "Select model first"}
                      disabled={!make || !model}
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
                  <Select value={sort} onValueChange={(value) => runSearch(1, { sort: value })}>
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
                        onValueCommit={(v) => runSearch(1, { maxPayment: paymentSliderToValue(v[0]) })}
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
                        onValueCommit={(v) =>
                          runSearch(1, {
                            ...(vehicleType === "new"
                              ? { maxPrice: priceSliderToValue(v[0]) }
                              : { usedMaxPrice: priceSliderToValue(v[0]) })
                          })
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
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Down payment</Label>
                        <Badge>${downPayment.toLocaleString()}</Badge>
                      </div>
                      <Slider
                        value={[downPayment]}
                        min={DOWN_PAYMENT_MIN}
                        max={DOWN_PAYMENT_MAX}
                        step={DOWN_PAYMENT_STEP}
                        onValueChange={(v) => setDownPayment(v[0])}
                        onValueCommit={(v) => runSearch(1, { downPayment: v[0] })}
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">$0</span>
                        <span className="absolute right-0">${DOWN_PAYMENT_MAX.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Loan term</Label>
                        <Badge>{termMonths} mo</Badge>
                      </div>
                      <Slider
                        value={[termMonths]}
                        min={TERM_MIN}
                        max={TERM_MAX}
                        step={TERM_STEP}
                        onValueChange={(v) => setTermMonths(v[0])}
                        onValueCommit={(v) => runSearch(1, { termMonths: v[0] })}
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">{TERM_MIN} mo</span>
                        <span className="absolute right-0">{TERM_MAX} mo</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Interest rate</Label>
                        <Badge>{apr.toFixed(2)}%</Badge>
                      </div>
                      <Slider
                        value={[apr]}
                        min={APR_MIN}
                        max={APR_MAX}
                        step={APR_STEP}
                        onValueChange={(v) => setApr(Number(v[0].toFixed(2)))}
                        onValueCommit={(v) => runSearch(1, { apr: Number(v[0].toFixed(2)) })}
                      />
                      <div className="relative h-4 text-[11px] text-ink-500">
                        <span className="absolute left-0">{APR_MIN}%</span>
                        <span className="absolute right-0">{APR_MAX}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-ink-600">
                      Finance estimate uses a {termMonths}-month loan, {apr.toFixed(2)}% APR, ${downPayment.toLocaleString()} down,
                      and estimated vehicle price plus 10% taxes.
                    </p>
                  </>
                )}
                {showUsedFilters && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Max mileage</Label>
                      <Badge>{maxMileage.toLocaleString()} mi</Badge>
                    </div>
                    <Slider
                      value={[maxMileage]}
                      min={0}
                      max={250000}
                      step={1000}
                      onValueChange={(v) => setMaxMileage(v[0])}
                      onValueCommit={(v) => runSearch(1, { maxMileage: v[0] })}
                    />
                  </div>
                )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 border-t border-ink-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
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

              <Tabs value={mode} onValueChange={(value) => setSearchMode(value as "price" | "payment")} className="w-full">
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
                      onValueChange={handleMakeChange}
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
                      onValueChange={handleModelChange}
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

                {showUsedFilters && (
                  <div className="space-y-2">
                    <Label>Year</Label>
                    {years.length > 0 ? (
                      <Select value={yearFilter || ANY_YEAR} onValueChange={handleYearChange}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Any year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_YEAR}>Any year</SelectItem>
                          {years.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="h-10" value={yearFilter} placeholder="Any year" disabled />
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Trim</Label>
                  {trims.length > 0 ? (
                    <Select
                      value={trim || ANY_TRIM}
                      onValueChange={handleTrimChange}
                      disabled={!make || !model}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={make && model ? "Any trim" : "Select model first"} />
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
                      placeholder={make && model ? "XLE" : "Select model first"}
                      disabled={!make || !model}
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
                  <Select value={sort} onValueChange={(value) => runSearch(1, { sort: value })}>
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
                      onValueCommit={(v) => runSearch(1, { maxPayment: paymentSliderToValue(v[0]) })}
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
                        onValueCommit={(v) =>
                          runSearch(1, {
                            ...(vehicleType === "new"
                              ? { maxPrice: priceSliderToValue(v[0]) }
                              : { usedMaxPrice: priceSliderToValue(v[0]) })
                          })
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
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Down payment</Label>
                      <Badge>${downPayment.toLocaleString()}</Badge>
                    </div>
                    <Slider
                      value={[downPayment]}
                      min={DOWN_PAYMENT_MIN}
                      max={DOWN_PAYMENT_MAX}
                      step={DOWN_PAYMENT_STEP}
                      onValueChange={(v) => setDownPayment(v[0])}
                      onValueCommit={(v) => runSearch(1, { downPayment: v[0] })}
                    />
                    <Input
                      className="h-10"
                      type="number"
                      min={DOWN_PAYMENT_MIN}
                      max={DOWN_PAYMENT_MAX}
                      step={DOWN_PAYMENT_STEP}
                      value={downPayment}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        setDownPayment(
                          Number.isFinite(raw) ? Math.min(DOWN_PAYMENT_MAX, Math.max(DOWN_PAYMENT_MIN, Math.round(raw))) : DOWN_PAYMENT_MIN
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch(1, { downPayment });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Loan term</Label>
                      <Badge>{termMonths} mo</Badge>
                    </div>
                    <Slider
                      value={[termMonths]}
                      min={TERM_MIN}
                      max={TERM_MAX}
                      step={TERM_STEP}
                      onValueChange={(v) => setTermMonths(v[0])}
                      onValueCommit={(v) => runSearch(1, { termMonths: v[0] })}
                    />
                    <Input
                      className="h-10"
                      type="number"
                      min={TERM_MIN}
                      max={TERM_MAX}
                      step={TERM_STEP}
                      value={termMonths}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        setTermMonths(
                          Number.isFinite(raw) ? Math.min(TERM_MAX, Math.max(TERM_MIN, Math.round(raw / TERM_STEP) * TERM_STEP)) : TERM_MIN
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch(1, { termMonths });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Interest rate</Label>
                      <Badge>{apr.toFixed(2)}%</Badge>
                    </div>
                    <Slider
                      value={[apr]}
                      min={APR_MIN}
                      max={APR_MAX}
                      step={APR_STEP}
                      onValueChange={(v) => setApr(Number(v[0].toFixed(2)))}
                      onValueCommit={(v) => runSearch(1, { apr: Number(v[0].toFixed(2)) })}
                    />
                    <Input
                      className="h-10"
                      type="number"
                      min={APR_MIN}
                      max={APR_MAX}
                      step={APR_STEP}
                      value={apr}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        setApr(Number.isFinite(raw) ? Math.min(APR_MAX, Math.max(APR_MIN, Number(raw.toFixed(2)))) : APR_MIN);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        runSearch(1, { apr });
                      }}
                    />
                  </div>
                  <p className="text-xs text-ink-600">
                    Finance estimate uses a {termMonths}-month loan, {apr.toFixed(2)}% APR, ${downPayment.toLocaleString()} down, and
                    estimated vehicle price plus 10% taxes.
                  </p>
                </>
              )}

              {showUsedFilters && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max mileage</Label>
                    <Badge>{maxMileage.toLocaleString()} mi</Badge>
                  </div>
                  <Slider
                    value={[maxMileage]}
                    min={0}
                    max={250000}
                    step={1000}
                    onValueChange={(v) => setMaxMileage(v[0])}
                    onValueCommit={(v) => runSearch(1, { maxMileage: v[0] })}
                  />
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

        {submitted && !resultsQuery.data && (resultsQuery.isPending || resultsQuery.isFetching) && (
          <Card className="tc-fade-up bg-white">
            <CardContent>
              <DealSearchLoader />
            </CardContent>
          </Card>
        )}

        {submitted && resultsQuery.isError && (
          <Card className="tc-fade-up bg-white">
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-red-700">We could not load inventory right now. Please try again.</p>
              <Button size="sm" onClick={() => resultsQuery.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {submitted && resultsQuery.data && (
          <>
            <div className="grid grid-cols-1 items-center gap-3 border-b border-ink-200 pb-4 sm:grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] sm:gap-x-4">
              <p className="justify-self-center text-sm font-medium text-ink-700 sm:justify-self-start">
                {totalResults.toLocaleString()} results
              </p>
              <div className="flex min-w-0 justify-center px-1">
                <MarketplaceLeaseFinanceTabs active="finance" />
              </div>
              <nav
                className="flex items-center justify-center gap-2 justify-self-center sm:justify-self-end"
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
                <VehicleCard
                  key={vehicle.vin}
                  vehicle={vehicle}
                  paymentMode={vehicleType === "new" && mode === "payment"}
                  selectedDownPayment={downPayment}
                />
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
      <SiteFooter />
    </div>
  );
}

function VehicleCard({
  vehicle,
  paymentMode,
  selectedDownPayment
}: {
  vehicle: Vehicle;
  paymentMode: boolean;
  selectedDownPayment?: number;
}) {
  const isUsed = inferVehicleListingType(vehicle) === "used";
  const showLeasePricing = !isUsed;
  const primaryPrice = resolveSearchCardPrimaryPrice(vehicle, isUsed);
  const msrpPrice = displayPrice(vehicle.msrp);
  const monthlyPrice = showLeasePricing
    ? paymentMode
      ? firstDisplayPrice(vehicle.estimated_monthly, vehicle.monthly)
      : firstDisplayPrice(vehicle.monthly, vehicle.estimated_monthly)
    : undefined;
  const downPrice = displayPrice(vehicle.down);
  const downForBadge = paymentMode
    ? typeof selectedDownPayment === "number" && Number.isFinite(selectedDownPayment)
      ? Math.max(0, Math.round(selectedDownPayment))
      : 0
    : downPrice ?? 0;
  const fullName = `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();
  const subtitle = `${vehicle.trim ?? "Trim unavailable"} | ${isUsed ? "Used car" : "New car"}`;
  const imageUrl = pickVehicleImage(vehicle);
  const detailsHref = `/vehicles/${encodeURIComponent(vehicle.vin)}`;
  const detailsActionHref = detailsHref;
  const showMsrpSecondary =
    !isUsed && msrpPrice !== undefined && primaryPrice !== undefined && primaryPrice !== msrpPrice;
  const imageBadgeLeaseLabel =
    monthlyPrice !== undefined
      ? `$${downForBadge.toLocaleString()} down, ${
          paymentMode
            ? monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : monthlyPrice.toLocaleString()
        }/mo ${paymentMode ? "est." : "lease"}`
      : null;
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
            <div className="absolute bottom-3 left-3 rounded-md bg-emerald-600/95 px-3 py-1.5 text-xs font-semibold text-white shadow-md sm:text-sm">
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
                {primaryPrice !== undefined
                  ? `$${primaryPrice.toLocaleString()}`
                  : !isUsed && msrpPrice !== undefined
                    ? `MSRP $${msrpPrice.toLocaleString()}`
                    : "Call for price"}
              </p>
              {showMsrpSecondary && msrpPrice !== undefined ? (
                <p className="text-xs text-ink-700 sm:text-right">MSRP ${msrpPrice.toLocaleString()}</p>
              ) : null}
            </div>
            {showLeasePricing ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 sm:text-sm">
                {monthlyPrice !== undefined
                  ? `$${downForBadge.toLocaleString()} down, ${
                      paymentMode
                        ? monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : monthlyPrice.toLocaleString()
                    }/mo est.`
                  : "Payment details on vehicle page"}
                <Info className="h-4 w-4 text-ink-500" />
              </p>
            ) : null}
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
                <Link href={detailsHref}>
                  <CreditCard className="mr-1 h-4 w-4" />
                  <span className="max-[420px]:hidden">More details</span>
                  <span className="hidden max-[420px]:inline">More details</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
