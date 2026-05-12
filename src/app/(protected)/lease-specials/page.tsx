"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, CarFront, ChevronDown, CircleDollarSign, Info, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { api, type Vehicle } from "@/lib/api";
import { displayPrice, firstDisplayPrice } from "@/lib/vehicle-pricing";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import DealSearchLoader from "@/components/deal-search-loader";
import MarketplaceLeaseFinanceTabs from "@/components/marketplace-lease-finance-tabs";
import LeadFormButton from "@/components/lead-form-button";
import { LEASE_SPECIALS_FAQ_ITEMS } from "@/content/marketing-faq";

const sortOptions = [
  { value: "payment_low_high", label: "Lowest payment first" },
  { value: "payment_high_low", label: "Highest payment first" },
  { value: "msrp_low_high", label: "Lowest price first" },
  { value: "price_high_low", label: "Highest price first" },
  { value: "year_newest", label: "Newest year first" },
  { value: "year_oldest", label: "Oldest year first" },
  { value: "make_a_z", label: "Make A to Z" },
  { value: "make_z_a", label: "Make Z to A" },
  { value: "model_a_z", label: "Model A to Z" },
  { value: "model_z_a", label: "Model Z to A" }
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
const pageSize = 12;

// Max payment: 0–2000 then Any (match front page)
const PAYMENT_MIN = 200;
const PAYMENT_MAX = 2000;
const PAYMENT_SLIDER_STOPS = 9;
const PAYMENT_SLIDER_ANY = 10;
const PAYMENT_ANY_VALUE = 10000;
const defaultMaxPayment = PAYMENT_ANY_VALUE;

function paymentToSliderValue(payment: number): number {
  if (payment >= PAYMENT_ANY_VALUE || payment > PAYMENT_MAX) return PAYMENT_SLIDER_ANY;
  const clamped = Math.min(PAYMENT_MAX, Math.max(PAYMENT_MIN, payment));
  return Math.round(((clamped - PAYMENT_MIN) / (PAYMENT_MAX - PAYMENT_MIN)) * PAYMENT_SLIDER_STOPS);
}
function paymentSliderToValue(sliderVal: number): number {
  if (sliderVal >= PAYMENT_SLIDER_ANY) return PAYMENT_ANY_VALUE;
  const normalized = Math.min(PAYMENT_SLIDER_STOPS, Math.max(0, sliderVal));
  const raw = PAYMENT_MIN + ((PAYMENT_MAX - PAYMENT_MIN) * normalized) / PAYMENT_SLIDER_STOPS;
  return Math.round(raw / 25) * 25;
}

// Max vehicle price: 0–150k then Any
const PRICE_MIN = 0;
const PRICE_MAX = 150000;
const PRICE_STEP = 5000;
const PRICE_TICKS = Math.round((PRICE_MAX - PRICE_MIN) / PRICE_STEP); // 0..30 = 0 to 150k
const PRICE_SLIDER_ANY = PRICE_TICKS + 1; // 31 = Any
const PRICE_ANY_VALUE = 999999;
const defaultMaxPrice = PRICE_ANY_VALUE;

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

function normKeyPart(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

/** One card per year + make + model; trims stack under the same card so the group footer can show counts. */
function modelGroupKey(vehicle: Vehicle): string {
  const yr =
    typeof vehicle.year === "number" && Number.isFinite(vehicle.year) ? String(Math.trunc(vehicle.year)) : "";
  const mk = normKeyPart(vehicle.make);
  const md = normKeyPart(vehicle.model);
  if (!mk && !md && !yr) return `vin:${(vehicle.vin ?? "").toUpperCase()}`;
  return `${yr}||${mk}||${md}`;
}

type LeaseModelGroup = {
  key: string;
  groupLabel: string;
  vehicles: Vehicle[];
};

/** Preserve sort order: first row per group is the featured listing for that lineup. */
function buildLeaseModelGroups(sorted: Vehicle[]): LeaseModelGroup[] {
  const map = new Map<string, Vehicle[]>();
  const order: string[] = [];
  for (const v of sorted) {
    const k = modelGroupKey(v);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(v);
  }
  return order.map((key) => {
    const vehicles = map.get(key)!;
    const v0 = vehicles[0];
    const groupLabel =
      [
        typeof v0.year === "number" && Number.isFinite(v0.year) ? String(Math.trunc(v0.year)) : "",
        (v0.make ?? "").trim(),
        (v0.model ?? "").trim()
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Vehicle";
    return { key, groupLabel, vehicles };
  });
}

/** One row per VIN (used after second "See All" when filters already match the model line). */
function singletonGroupsFromVehicles(sorted: Vehicle[]): LeaseModelGroup[] {
  return sorted.map((v) => ({
    key: `vin:${(v.vin ?? "").toUpperCase()}`,
    groupLabel: "",
    vehicles: [v]
  }));
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

function parseYearParam(value: string | null): string {
  if (value == null || !value.trim()) return "";
  const n = parseInt(value.trim(), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? String(n) : "";
}

function sanitizeFilterOptions(items: string[] | undefined): string[] {
  return Array.from(new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => !!item)));
}

/** `models_by_make` keys often differ in casing from inventory `vehicle.make`. */
function resolveCandidateModelsForMake(
  make: string,
  modelsByMake: Record<string, string[]>,
  makes: string[]
): string[] {
  const trimmed = make.trim();
  if (!trimmed) return [];
  if (modelsByMake[trimmed]?.length) {
    return sanitizeFilterOptions(modelsByMake[trimmed]);
  }
  const canonFromList = makes.find((m) => m.trim().toLowerCase() === trimmed.toLowerCase());
  if (canonFromList && modelsByMake[canonFromList]?.length) {
    return sanitizeFilterOptions(modelsByMake[canonFromList]);
  }
  const key = Object.keys(modelsByMake).find((k) => k.trim().toLowerCase() === trimmed.toLowerCase());
  if (key && modelsByMake[key]?.length) {
    return sanitizeFilterOptions(modelsByMake[key]);
  }
  return [];
}

function LeaseSpecialsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [make, setMake] = useState(searchParams.get("make") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [trim, setTrim] = useState(searchParams.get("trim") ?? "");
  const [yearFilter, setYearFilter] = useState(() => parseYearParam(searchParams.get("year")));
  const [sort, setSort] = useState(searchParams.get("sort") ?? sortOptions[0].value);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [maxPayment, setMaxPayment] = useState(parsePositiveNumber(searchParams.get("max_payment"), defaultMaxPayment));
  const [maxPrice, setMaxPrice] = useState(parsePositiveNumber(searchParams.get("max_price"), defaultMaxPrice));
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), 1));
  /** When `flat=1` in the URL, show every matching VIN as its own card (per-VIN list after "See All" on a lineup). */
  const flatVinList = searchParams.get("flat") === "1";

  const filtersQuery = useQuery({
    queryKey: ["filters", "lease-specials"],
    queryFn: () => api.getFilters({ vehicle_type: "new", offers_only: true }),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const makes = sanitizeFilterOptions(filtersQuery.data?.makes);
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const models = useMemo(() => {
    if (!make.trim()) return [];
    const candidateModels = resolveCandidateModelsForMake(make, modelsByMake, makes);
    if (candidateModels.length === 0) return candidateModels;
    const makeNames = new Set(makes.map((item) => item.trim().toLowerCase()));
    const selectedMake = make.trim().toLowerCase();
    // Defensive cleanup: some feeds leak make names into model lists.
    return candidateModels.filter((item) => {
      const normalized = item.trim().toLowerCase();
      return normalized === selectedMake || !makeNames.has(normalized);
    });
  }, [make, makes, modelsByMake]);

  /** Always pull a large batch; lineup grouping and sort run client-side. */
  const fetchParams = useMemo(
    () => ({
      vehicle_type: "new",
      offers_only: true,
      make,
      model,
      trim: trim.trim() || undefined,
      year: yearFilter ? Number(yearFilter) : undefined,
      max_payment: maxPayment,
      max_price: maxPrice,
      sort: getBackendSort(sort),
      page: 1,
      page_size: 4000
    }),
    [make, model, trim, yearFilter, maxPayment, maxPrice, sort]
  );
  const [appliedFetchParams, setAppliedFetchParams] = useState(fetchParams);

  const resultsQuery = useQuery({
    queryKey: ["lease-specials", appliedFetchParams],
    queryFn: () => api.search(appliedFetchParams),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const resultItems = resultsQuery.data?.results ?? [];
  const sortedResultItems = useMemo(() => {
    const items = [...resultItems];
    const vehiclePrice = (item: Vehicle, fallback: number) =>
      firstDisplayPrice(item.discounted, item.msrp, item.listed_price) ?? fallback;
    const byTextAsc = (a: string | undefined, b: string | undefined) => {
      const left = (a ?? "").trim();
      const right = (b ?? "").trim();
      if (left && right) return left.localeCompare(right, undefined, { sensitivity: "base" });
      if (left || right) return left ? -1 : 1;
      return 0;
    };

    if (sort === "payment_low_high") {
      items.sort((a, b) => {
        const aMonthly = displayPrice(a.monthly);
        const bMonthly = displayPrice(b.monthly);
        const aHasMonthly = aMonthly !== undefined;
        const bHasMonthly = bMonthly !== undefined;
        if (aHasMonthly && bHasMonthly) {
          if (aMonthly !== bMonthly) return aMonthly - bMonthly;
        } else if (aHasMonthly !== bHasMonthly) {
          return aHasMonthly ? -1 : 1;
        }
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        if (aPrice !== bPrice) return aPrice - bPrice;
        return (a.vin ?? "").localeCompare(b.vin ?? "");
      });
    } else if (sort === "payment_high_low") {
      items.sort((a, b) => {
        const aMonthly = displayPrice(a.monthly);
        const bMonthly = displayPrice(b.monthly);
        const aHasMonthly = aMonthly !== undefined;
        const bHasMonthly = bMonthly !== undefined;
        if (aHasMonthly && bHasMonthly) {
          if (aMonthly !== bMonthly) return bMonthly - aMonthly;
        } else if (aHasMonthly !== bHasMonthly) {
          return aHasMonthly ? -1 : 1;
        }
        const aPrice = vehiclePrice(a, 0);
        const bPrice = vehiclePrice(b, 0);
        if (aPrice !== bPrice) return bPrice - aPrice;
        return (b.vin ?? "").localeCompare(a.vin ?? "");
      });
    } else if (sort === "price_high_low") {
      items.sort((a, b) => {
        const aPrice = vehiclePrice(a, 0);
        const bPrice = vehiclePrice(b, 0);
        if (aPrice !== bPrice) return bPrice - aPrice;
        return (b.vin ?? "").localeCompare(a.vin ?? "");
      });
    } else if (sort === "year_newest") {
      items.sort((a, b) => {
        const aYear = typeof a.year === "number" ? a.year : null;
        const bYear = typeof b.year === "number" ? b.year : null;
        if (aYear !== null && bYear !== null) {
          if (aYear !== bYear) return bYear - aYear;
        } else if (aYear !== bYear) {
          return aYear === null ? 1 : -1;
        }
        const textOrder = byTextAsc(a.make, b.make) || byTextAsc(a.model, b.model);
        if (textOrder !== 0) return textOrder;
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        if (aPrice !== bPrice) return aPrice - bPrice;
        return (a.vin ?? "").localeCompare(b.vin ?? "");
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
        const textOrder = byTextAsc(a.make, b.make) || byTextAsc(a.model, b.model);
        if (textOrder !== 0) return textOrder;
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        if (aPrice !== bPrice) return aPrice - bPrice;
        return (a.vin ?? "").localeCompare(b.vin ?? "");
      });
    } else if (sort === "make_a_z") {
      items.sort((a, b) => {
        const primary =
          byTextAsc(a.make, b.make) ||
          byTextAsc(a.model, b.model);
        if (primary !== 0) return primary;
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        if (aPrice !== bPrice) return aPrice - bPrice;
        return (a.vin ?? "").localeCompare(b.vin ?? "");
      });
    } else if (sort === "make_z_a") {
      items.sort((a, b) => {
        const primary =
          byTextAsc(b.make, a.make) ||
          byTextAsc(b.model, a.model);
        if (primary !== 0) return primary;
        const aPrice = vehiclePrice(a, 0);
        const bPrice = vehiclePrice(b, 0);
        if (aPrice !== bPrice) return bPrice - aPrice;
        return (b.vin ?? "").localeCompare(a.vin ?? "");
      });
    } else if (sort === "model_a_z") {
      items.sort((a, b) => {
        const primary =
          byTextAsc(a.model, b.model) ||
          byTextAsc(a.make, b.make);
        if (primary !== 0) return primary;
        const aPrice = vehiclePrice(a, Number.MAX_SAFE_INTEGER);
        const bPrice = vehiclePrice(b, Number.MAX_SAFE_INTEGER);
        if (aPrice !== bPrice) return aPrice - bPrice;
        return (a.vin ?? "").localeCompare(b.vin ?? "");
      });
    } else if (sort === "model_z_a") {
      items.sort((a, b) => {
        const primary =
          byTextAsc(b.model, a.model) ||
          byTextAsc(b.make, a.make);
        if (primary !== 0) return primary;
        const aPrice = vehiclePrice(a, 0);
        const bPrice = vehiclePrice(b, 0);
        if (aPrice !== bPrice) return bPrice - aPrice;
        return (b.vin ?? "").localeCompare(a.vin ?? "");
      });
    }
    return items;
  }, [resultItems, sort]);

  const modelGroups = useMemo(() => {
    if (flatVinList) {
      return singletonGroupsFromVehicles(sortedResultItems);
    }
    return buildLeaseModelGroups(sortedResultItems);
  }, [sortedResultItems, flatVinList]);

  const totalResults = resultsQuery.data?.total ?? sortedResultItems.length;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(modelGroups.length / pageSize));
  }, [modelGroups.length]);

  const currentPage = Math.min(page, totalPages);

  const pageModelGroups = useMemo((): LeaseModelGroup[] => {
    const start = (currentPage - 1) * pageSize;
    return modelGroups.slice(start, start + pageSize);
  }, [modelGroups, currentPage]);

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (make) chips.push({ key: "make", label: `Make: ${make}` });
    if (model) chips.push({ key: "model", label: `Model: ${model}` });
    if (trim.trim()) chips.push({ key: "trim", label: `Trim: ${trim.trim()}` });
    if (yearFilter) chips.push({ key: "year", label: `Year: ${yearFilter}` });
    if (maxPayment !== defaultMaxPayment) chips.push({ key: "maxPayment", label: `Payment up to $${maxPayment}/mo` });
    if (maxPrice !== defaultMaxPrice) chips.push({ key: "maxPrice", label: `Price up to $${maxPrice.toLocaleString()}` });
    if (sort !== sortOptions[0].value) {
      const sortLabel = sortOptions.find((s) => s.value === sort)?.label ?? sort;
      chips.push({ key: "sort", label: `Sort: ${sortLabel}` });
    }
    return chips;
  }, [make, model, maxPayment, maxPrice, sort]);
  const emptyStateMessage = useMemo(() => {
    const selection = [make, model, trim.trim() || undefined, yearFilter || undefined].filter(Boolean).join(" ");
    if (selection) {
      return `No lease offers found for ${selection}. Try widening filters or clearing trim/year.`;
    }
    return "No matches yet. Try raising your payment target or clearing make/model.";
  }, [make, model, trim, yearFilter]);
  const searchReturnUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const nextMake = searchParams.get("make") ?? "";
    const nextModel = searchParams.get("model") ?? "";
    const nextTrim = searchParams.get("trim") ?? "";
    const nextYear = parseYearParam(searchParams.get("year"));
    const nextSort = searchParams.get("sort") ?? sortOptions[0].value;
    const nextMaxPayment = parsePositiveNumber(searchParams.get("max_payment"), defaultMaxPayment);
    const nextMaxPrice = parsePositiveNumber(searchParams.get("max_price"), defaultMaxPrice);
    const nextPage = parsePositiveNumber(searchParams.get("page"), 1);

    setMake(nextMake);
    setModel(nextModel);
    setTrim(nextTrim);
    setYearFilter(nextYear);
    setSort(nextSort);
    setMaxPayment(nextMaxPayment);
    setMaxPrice(nextMaxPrice);
    setPage(nextPage);
    setAppliedFetchParams({
      vehicle_type: "new",
      offers_only: true,
      make: nextMake,
      model: nextModel,
      trim: nextTrim.trim() || undefined,
      year: nextYear ? Number(nextYear) : undefined,
      max_payment: nextMaxPayment,
      max_price: nextMaxPrice,
      sort: getBackendSort(nextSort),
      page: 1,
      page_size: 4000
    });
  }, [searchParams]);

  function runSearch(
    nextPage = 1,
    overrides?: Partial<{
      make: string;
      model: string;
      trim: string;
      year: string;
      sort: string;
      maxPayment: number;
      maxPrice: number;
    }>,
    opts?: { flatVinList?: boolean }
  ) {
    const nextMake = overrides?.make ?? make;
    const nextModel = overrides?.model ?? model;
    const nextTrim = overrides?.trim !== undefined ? overrides.trim : trim;
    const nextYearFilter = overrides?.year !== undefined ? overrides.year : yearFilter;
    const nextSort = overrides?.sort ?? sort;
    const nextMaxPayment = overrides?.maxPayment ?? maxPayment;
    const nextMaxPrice = overrides?.maxPrice ?? maxPrice;
    const query = new URLSearchParams();
    if (nextMake) query.set("make", nextMake);
    if (nextModel) query.set("model", nextModel);
    if (nextTrim.trim()) query.set("trim", nextTrim.trim());
    if (nextYearFilter) query.set("year", nextYearFilter);
    if (nextSort !== sortOptions[0].value) query.set("sort", nextSort);
    query.set("max_payment", String(nextMaxPayment));
    query.set("max_price", String(nextMaxPrice));
    query.set("page", String(nextPage));
    if (opts?.flatVinList) query.set("flat", "1");
    router.replace(`${pathname}?${query.toString()}`);
    setPage(nextPage);
    setMake(nextMake);
    setModel(nextModel);
    setTrim(nextTrim);
    setYearFilter(nextYearFilter);
    setSort(nextSort);
    setMaxPayment(nextMaxPayment);
    setMaxPrice(nextMaxPrice);
    setAppliedFetchParams({
      vehicle_type: "new",
      offers_only: true,
      make: nextMake,
      model: nextModel,
      trim: nextTrim.trim() || undefined,
      year: nextYearFilter ? Number(nextYearFilter) : undefined,
      max_payment: nextMaxPayment,
      max_price: nextMaxPrice,
      sort: getBackendSort(nextSort),
      page: 1,
      page_size: 4000
    });
  }

  function handleMakeChange(nextMakeValue: string) {
    const nextMake = nextMakeValue === ANY_MAKE ? "" : nextMakeValue;
    if (nextMake === make) return;
    runSearch(1, { make: nextMake, model: "", trim: "", year: "" });
  }

  function handleModelChange(nextModelValue: string) {
    const nextModel = nextModelValue === ANY_MODEL ? "" : nextModelValue;
    if (nextModel === model) return;
    runSearch(1, { model: nextModel, trim: "", year: "" });
  }

  useEffect(() => {
    if (filtersQuery.isLoading) return;

    let normalizedMake = make;
    let normalizedModel = model;

    // Only validate against loaded option lists. If `models` is still empty (e.g. make just
    // switched from ""), `includes` would falsely clear a valid model from "See All".
    if (normalizedMake && makes.length > 0) {
      const makeMatch = makes.find(
        (m) => m.trim().toLowerCase() === (normalizedMake ?? "").trim().toLowerCase()
      );
      if (!makeMatch) {
        normalizedMake = "";
        normalizedModel = "";
      } else if (makeMatch !== normalizedMake) {
        normalizedMake = makeMatch;
      }
    }
    if (normalizedModel && models.length > 0) {
      const modelMatch = models.find(
        (m) => m.trim().toLowerCase() === (normalizedModel ?? "").trim().toLowerCase()
      );
      if (!modelMatch) {
        normalizedModel = "";
      } else if (modelMatch !== normalizedModel) {
        normalizedModel = modelMatch;
      }
    }

    if (normalizedMake === make && normalizedModel === model) return;
    // Do not pass year: "" here — that wiped year/make/model filters after "See All".
    runSearch(1, { make: normalizedMake, model: normalizedModel, trim: "" });
  }, [filtersQuery.isLoading, makes, models, make, model]);

  useEffect(() => {
    if (page <= totalPages) return;
    runSearch(totalPages);
  }, [page, totalPages]);

  function clearSingleFilter(key: string) {
    if (key === "make") {
      runSearch(1, { make: "", model: "", trim: "", year: "" });
      return;
    }
    if (key === "model") {
      runSearch(1, { model: "", trim: "", year: "" });
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
    if (key === "maxPayment") {
      setMaxPayment(defaultMaxPayment);
      runSearch(1, { maxPayment: defaultMaxPayment });
      return;
    }
    if (key === "maxPrice") {
      setMaxPrice(defaultMaxPrice);
      runSearch(1, { maxPrice: defaultMaxPrice });
      return;
    }
    if (key === "sort") {
      const defaultSort = sortOptions[0].value;
      setSort(defaultSort);
      runSearch(1, { sort: defaultSort });
    }
  }

  function clearFilters() {
    router.replace(pathname);
  }

  function narrowDownToGroup(group: LeaseModelGroup) {
    const first = group.vehicles[0];
    let nextMake = (first.make ?? "").trim();
    let nextModel = (first.model ?? "").trim();
    const nextYear =
      typeof first.year === "number" && Number.isFinite(first.year) ? String(Math.trunc(first.year)) : "";
    if (!nextMake || !nextModel) return;

    if (makes.length > 0) {
      const makeCanon = makes.find((m) => m.trim().toLowerCase() === nextMake.toLowerCase());
      if (makeCanon) nextMake = makeCanon;
    }
    const modelCandidates = resolveCandidateModelsForMake(nextMake, modelsByMake, makes);
    if (nextModel && modelCandidates.length > 0) {
      const modelCanon = modelCandidates.find((m) => m.trim().toLowerCase() === nextModel.toLowerCase());
      if (modelCanon) nextModel = modelCanon;
    }

    const makeSame = nextMake.toLowerCase() === make.trim().toLowerCase();
    const modelSame = nextModel.toLowerCase() === model.trim().toLowerCase();
    const trimClear = !trim.trim();
    const yearSame = (yearFilter || "") === (nextYear || "");
    const alreadyNarrowed = makeSame && modelSame && trimClear && yearSame;

    // Filters already match → expand to each VIN (preserve other query params).
    if (alreadyNarrowed && group.vehicles.length > 1) {
      const query = new URLSearchParams(searchParams.toString());
      query.set("flat", "1");
      query.set("page", "1");
      router.replace(`${pathname}?${query.toString()}`);
      return;
    }

    // From grouped lineup: one click opens every VIN for this model line (no intermediate grouped-only step).
    const flatVinList = group.vehicles.length > 1;
    runSearch(1, { make: nextMake, model: nextModel, trim: "", year: nextYear }, flatVinList ? { flatVinList: true } : undefined);
  }

  function collapseFlatVinList() {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("flat");
    query.set("page", "1");
    router.replace(`${pathname}?${query.toString()}`);
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-4 sm:space-y-6">
        <section className="tc-fade-up relative w-full overflow-hidden rounded-3xl border border-ink-200 bg-white px-4 pb-4 pt-4 shadow-sm sm:px-7 sm:pb-6 sm:pt-5">
          <div className="relative">
            <img
              src="/images/ribon.png"
              alt="A vibrant red satin ribbon bow tied diagonally across."
              className="pointer-events-none absolute m-0 p-0 right-0 top-0 w-64 max-w-none translate-x-[38%] -translate-y-[38%] opacity-95 sm:w-80 sm:translate-x-[42%] sm:-translate-y-[42%]"
            />
            <p className="market-kicker">Lease Offers</p>
            <h1 className="market-heading flex items-center gap-2 text-2xl sm:text-4xl">
              <CarFront className="h-7 w-7 text-brand-700" />
              Lease Specials
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600 sm:max-w-3xl">
              Live <strong>online lease specials in California</strong> with real payments. Use filters to{" "}
              <strong>compare car lease offers in California</strong> by monthly payment, price, make, and model — including{" "}
              <strong>new car lease specials</strong> when available.
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
            <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-[min(88vw,340px)] max-w-[340px] translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-r border-ink-200 p-0 shadow-xl">
              <DialogHeader className="shrink-0 border-b border-ink-200 px-4 pb-3 pr-12 pt-10">
                <DialogTitle className="flex items-center gap-2 text-left">
                  <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                  Narrow down
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch]">
                <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max monthly payment</Label>
                    <Badge>{maxPayment >= PAYMENT_ANY_VALUE ? "Any" : `$${maxPayment}/mo`}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentPresets.map((value) => (
                      <Button key={value} variant="outline" size="sm" onClick={() => runSearch(1, { maxPayment: value })}>
                        Up to ${value}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" className="col-span-2" onClick={() => runSearch(1, { maxPayment: PAYMENT_ANY_VALUE })}>
                      Any
                    </Button>
                  </div>
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
                    <span className="absolute right-0 text-right">${PAYMENT_MAX.toLocaleString()} / Any</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max vehicle price</Label>
                    <Badge>{maxPrice >= PRICE_ANY_VALUE ? "Any" : `$${maxPrice.toLocaleString()}`}</Badge>
                  </div>
                  <Slider
                    value={[priceToSliderValue(maxPrice)]}
                    min={0}
                    max={PRICE_SLIDER_ANY}
                    step={1}
                    onValueChange={(v) => setMaxPrice(priceSliderToValue(v[0]))}
                    onValueCommit={(v) => runSearch(1, { maxPrice: priceSliderToValue(v[0]) })}
                  />
                  <div className="relative h-4 text-[11px] text-ink-500">
                    <span className="absolute left-0">$0</span>
                    <span className="absolute right-0">$150k / Any</span>
                  </div>
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
                  <Select
                    value={sort}
                    onValueChange={(value) => {
                      setSort(value);
                      runSearch(1, { sort: value });
                    }}
                  >
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
              </div>
              <div className="flex shrink-0 gap-2 border-t border-ink-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
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
                <Badge>{maxPayment >= PAYMENT_ANY_VALUE ? "Any" : `$${maxPayment}/mo`}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {paymentPresets.map((value) => (
                  <Button key={value} variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => runSearch(1, { maxPayment: value })}>
                    Up to ${value}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => runSearch(1, { maxPayment: PAYMENT_ANY_VALUE })}>
                  Any
                </Button>
              </div>
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
                <span className="absolute right-0 text-right">${PAYMENT_MAX.toLocaleString()} / Any</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max vehicle price</Label>
                <Badge>{maxPrice >= PRICE_ANY_VALUE ? "Any" : `$${maxPrice.toLocaleString()}`}</Badge>
              </div>
              <Slider
                value={[priceToSliderValue(maxPrice)]}
                min={0}
                max={PRICE_SLIDER_ANY}
                step={1}
                onValueChange={(v) => setMaxPrice(priceSliderToValue(v[0]))}
                onValueCommit={(v) => runSearch(1, { maxPrice: priceSliderToValue(v[0]) })}
              />
              <div className="relative h-4 text-[11px] text-ink-500">
                <span className="absolute left-0">$0</span>
                <span className="absolute right-0">$150k / Any</span>
              </div>
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
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(value);
                    runSearch(1, { sort: value });
                  }}
                >
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

        {resultsQuery.isLoading && (
          <Card className="bg-white">
            <CardContent>
              <DealSearchLoader />
            </CardContent>
          </Card>
        )}

        {resultsQuery.isError && (
          <Card className="bg-white">
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-red-700">We could not load lease specials right now. Please try again.</p>
              <Button size="sm" onClick={() => resultsQuery.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {resultsQuery.data && (
          <>
            <div className="flex flex-col gap-2 border-b border-ink-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm font-medium text-ink-700 sm:justify-start">
                <CircleDollarSign className="h-4 w-4 shrink-0 text-brand-700" />
                <span>{totalResults.toLocaleString()} matching cars</span>
                {modelGroups.length > 0 ? (
                  <span className="font-normal text-ink-500">
                    · {modelGroups.length.toLocaleString()}{" "}
                    {flatVinList ? (
                      <>listing{modelGroups.length === 1 ? "" : "s"} (each car)</>
                    ) : (
                      <>model{modelGroups.length === 1 ? "" : "s"} (grouped)</>
                    )}
                  </span>
                ) : null}
                {flatVinList ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-700 underline decoration-brand-600/60 underline-offset-2 hover:text-brand-800"
                    onClick={collapseFlatVinList}
                  >
                    Group by model line
                  </button>
                ) : null}
              </p>
              <div className="flex justify-center sm:justify-end">
                <MarketplaceLeaseFinanceTabs active="lease" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageModelGroups.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  <CardContent className="py-10 text-center text-ink-500">{emptyStateMessage}</CardContent>
                </Card>
              )}
              {pageModelGroups.map((group) => (
                <LeaseSpecialModelGroup
                  key={group.key}
                  group={group}
                  onSeeAll={() => narrowDownToGroup(group)}
                  returnUrl={searchReturnUrl}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-5">
              <p className="text-sm text-ink-500">
                Page {currentPage} of {totalPages}
                {pageModelGroups.length > 0 ? (
                  <span className="text-ink-400">
                    {" "}
                    · {pageModelGroups.length} {flatVinList ? "cars" : "model lineups"} on this page
                  </span>
                ) : null}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => runSearch(currentPage - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => runSearch(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
        </div>
        </div>

        <LeaseSpecialsSeoFooter />
      </main>
      <SiteFooter />
    </div>
  );
}

function LeaseSpecialsSeoFooter() {
  return (
    <section className="tc-fade-up border-t border-ink-200/80 pt-2">
      <details className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <summary className="group flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-600 sm:px-5">
          Lease specials info and FAQs
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-ink-100 px-4 pb-4 pt-3 text-xs leading-relaxed text-ink-600 sm:px-5">
          <p>
            Browse <strong>new car lease specials</strong> with live payment estimates so you can compare offers by make, model,
            monthly budget, and price in one place.
          </p>
          <p>
            Filters help you quickly narrow deals across California, including Los Angeles, Orange County, Ventura, and Santa
            Barbara, without bouncing between dealership sites.
          </p>
          <div className="overflow-hidden rounded-lg border border-ink-100 bg-ink-50/50">
            {LEASE_SPECIALS_FAQ_ITEMS.map((faq, index) => (
              <details key={index} className="group border-b border-ink-100 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold text-ink-800">
                  <span className="min-w-0 flex-1">{faq.question}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-ink-100 px-3 pb-3 pt-2 text-xs leading-relaxed text-ink-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function LeaseSpecialModelGroup({
  group,
  onSeeAll,
  returnUrl
}: {
  group: LeaseModelGroup;
  onSeeAll: () => void;
  returnUrl?: string;
}) {
  const primary = group.vehicles[0];
  const totalInGroup = group.vehicles.length;
  const showSeeAll = totalInGroup > 1;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <LeaseSpecialCard vehicle={primary} returnUrl={returnUrl} />
      <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-2.5">
        <p className="text-sm font-medium text-ink-900">
          {totalInGroup.toLocaleString()} {totalInGroup === 1 ? "car" : "cars"}
        </p>
        {showSeeAll ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 hover:bg-ink-50"
            onClick={onSeeAll}
          >
            See All
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LeaseSpecialCard({
  vehicle,
  returnUrl: _returnUrl
}: {
  vehicle: Vehicle;
  returnUrl?: string;
}) {
  const router = useRouter();
  const monthlyDisplay = displayPrice(vehicle.monthly);
  const downDisplay = displayPrice(vehicle.down);
  const downForBadge = downDisplay ?? 0;
  const detailsHref = `/vehicles/${encodeURIComponent(vehicle.vin)}`;
  const detailsActionHref = detailsHref;
  const fullName = `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.trim ?? ""}`.trim();
  const imageUrl = pickVehicleImage(vehicle);
  const msrpDisplay = displayPrice(vehicle.msrp);
  const checkAvailabilityHref = `/credit-application?vin=${encodeURIComponent(vehicle.vin)}&make=${encodeURIComponent(vehicle.make ?? "")}&model=${encodeURIComponent(vehicle.model ?? "")}&trim=${encodeURIComponent(vehicle.trim ?? "")}`;
  const leaseMeta: string[] = [];
  if (vehicle.term_months && vehicle.term_months > 0) leaseMeta.push(`${vehicle.term_months} mo`);
  if (vehicle.miles_per_year && vehicle.miles_per_year > 0) leaseMeta.push(`${vehicle.miles_per_year.toLocaleString()} mi/yr`);

  const handleApplyForFinancing = () => {
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
          {monthlyDisplay !== undefined && (
            <div className="absolute bottom-2 left-2 rounded-full bg-emerald-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow sm:bottom-3 sm:left-3 sm:text-xs">
              ${downForBadge.toLocaleString()} down, ${monthlyDisplay.toLocaleString()}/mo
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
            {msrpDisplay !== undefined && (
              <p className="text-2xl font-semibold tracking-tight text-ink-900">
                ${msrpDisplay.toLocaleString()} <span className="text-sm font-medium text-ink-600">MSRP</span>
              </p>
            )}
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 sm:text-xs">
              {monthlyDisplay !== undefined ? `$${downForBadge.toLocaleString()} down, $${monthlyDisplay.toLocaleString()}/mo lease` : "Monthly offer coming soon"}
              <Info className="h-4 w-4 text-ink-500" />
            </p>
            {downDisplay !== undefined && <p className="mt-1 text-xs text-ink-700">Down ${downDisplay.toLocaleString()}</p>}
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
              <span className="max-[420px]:hidden">Check Availability</span>
              <span className="hidden max-[420px]:inline">Check</span>
            </LeadFormButton>
            <Button size="sm" variant="outline" className="rounded-full" onClick={handleApplyForFinancing}>
              <span className="max-[420px]:hidden">Apply for financing</span>
              <span className="hidden max-[420px]:inline">Apply</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
