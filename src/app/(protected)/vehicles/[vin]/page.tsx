"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { DEFAULT_CAR_IMAGE, pickVehicleImage } from "@/lib/vehicle-image";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/components/auth-provider";
import LeadFormButton from "@/components/lead-form-button";
import { CheckCircle2, CreditCard, FileText, Heart, MessageSquare, ShieldCheck } from "lucide-react";

type SpecItem = {
  label: string;
  value: string;
};

function normalizeSpecKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatSpecValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const clean = value.trim();
    return clean ? clean : undefined;
  }
  return undefined;
}

function formatMoney(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return `$${value.toLocaleString()}`;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const vin = params?.vin as string;
  const { user } = useAuth();
  const normalizedRole = (user?.role ?? "").toLowerCase();
  const isBrokerUser = ["broker", "broker_admin", "admin", "dealer"].includes(normalizedRole);
  const { toast } = useToast();
  const [down, setDown] = useState(2000);
  const [term, setTerm] = useState(72);
  const [apr, setApr] = useState(5);
  const [dealName, setDealName] = useState(user?.name ?? "");
  const [dealEmail, setDealEmail] = useState(user?.email ?? "");
  const [dealPhone, setDealPhone] = useState("");
  const [dealVerified, setDealVerified] = useState(false);
  const [dealReadyToProceed, setDealReadyToProceed] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const maskedVin = useMemo(() => {
    const clean = (vin ?? "").trim();
    if (!clean) return "*****";
    return `${clean.slice(0, 5)}****`;
  }, [vin]);

  const vehicleQuery = useQuery({
    queryKey: ["vehicle", vin],
    queryFn: () => api.getVehicle(vin),
    enabled: !!vin
  });

  const estimateMutation = useMutation({
    mutationFn: () => api.estimatePayment({ vin, down, term, apr }),
    onSuccess: (data) => {
      toast({
        variant: "success",
        title: "Payment estimated",
        description: data.monthly ? `Estimated monthly: $${data.monthly.toLocaleString()}` : "Estimate ready."
      });
    },
    onError: (error: any) => {
      toast({
        variant: "error",
        title: "Estimate failed",
        description: error?.message ?? "Unable to estimate payment."
      });
    }
  });

  useEffect(() => {
    setDealName(user?.name ?? "");
    setDealEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const favoriteMutation = useMutation({
    mutationFn: () => api.toggleFavorite(vin),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Saved to favorites"
      });
    },
    onError: (error: any) => {
      const rawMessage = String(error?.message ?? "").trim();
      const needsLogin = rawMessage.toLowerCase() === "login to continue" || rawMessage.toLowerCase() === "not authenticated";
      toast({
        variant: "error",
        title: needsLogin ? "Login to continue" : "Save failed",
        description: needsLogin ? "Login to continue" : (rawMessage || "Unable to save favorite.")
      });
    }
  });

  const dealMutation = useMutation({
    mutationFn: () =>
      api.createDeal({
        vin,
        customer_note: `Deal start pre-verified. Name=${dealName.trim()} | Email=${dealEmail.trim()} | Phone=${dealPhone.trim() || "N/A"} | Customer confirmed contact + ready to proceed.`
      }),
    onSuccess: (data) => {
      setDealPhone("");
      setDealVerified(false);
      setDealReadyToProceed(false);
      toast({
        variant: "success",
        title: "Deal started",
        description: `Deal #${data.id} is now in ${data.status.replaceAll("_", " ")}.`
      });
    },
    onError: (error: any) => {
      toast({
        variant: "error",
        title: "Could not start deal",
        description: error?.message ?? "Please try again."
      });
    }
  });

  const confirmAvailabilityMutation = useMutation({
    mutationFn: () => api.sendMessage({ vin, message: `Please confirm availability for VIN ${vin}.` }),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Availability requested",
        description: "We sent your availability confirmation request."
      });
    },
    onError: (error: any) => {
      toast({
        variant: "error",
        title: "Request failed",
        description: error?.message ?? "Unable to confirm availability."
      });
    }
  });

  const photos = useMemo(() => {
    const base = vehicleQuery.data?.photos ? [...vehicleQuery.data.photos] : [];
    if (vehicleQuery.data?.photo && !base.includes(vehicleQuery.data.photo)) {
      base.unshift(vehicleQuery.data.photo);
    }
    if (base.length === 0 && vehicleQuery.data) {
      base.push(pickVehicleImage(vehicleQuery.data));
    }
    return base.slice(0, 5);
  }, [vehicleQuery.data]);

  useEffect(() => {
    setSelectedPhoto(0);
  }, [vin, photos.length]);

  const normalizedType = (vehicleQuery.data?.vehicle_type ?? "new").toString().toLowerCase();
  const normalizedCondition = (vehicleQuery.data?.condition ?? "").toString().toLowerCase();
  const inferredType =
    normalizedCondition === "new"
      ? "new"
      : normalizedCondition === "used" || normalizedCondition === "cpo"
      ? "used"
      : normalizedType === "used"
      ? "used"
      : "new";
  const isUsed = inferredType === "used";
  const isCpo = normalizedCondition === "cpo";
  const badgeLabel = isCpo ? "CPO" : isUsed ? "USED" : "NEW";
  const historyLink = vehicleQuery.data?.vehicle_history_url ?? vehicleQuery.data?.history_url;
  const hasOfferSheetData = useMemo(
    () =>
      [
        vehicleQuery.data?.monthly,
        vehicleQuery.data?.down,
        vehicleQuery.data?.discounted,
        vehicleQuery.data?.term_months,
        vehicleQuery.data?.miles_per_year
      ].some((value) => value !== undefined && value !== null),
    [
      vehicleQuery.data?.monthly,
      vehicleQuery.data?.down,
      vehicleQuery.data?.discounted,
      vehicleQuery.data?.term_months,
      vehicleQuery.data?.miles_per_year
    ]
  );
  const detailSpecs = useMemo<SpecItem[]>(() => {
    const raw = vehicleQuery.data?.details;
    if (!raw || typeof raw !== "object") return [];
    const detailEntries = Object.entries(raw as Record<string, unknown>);
    if (detailEntries.length === 0) return [];

    const normalizedValueMap = new Map<string, string>();
    for (const [key, value] of detailEntries) {
      const normalized = normalizeSpecKey(key);
      const formatted = formatSpecValue(value);
      if (!normalized || !formatted || normalizedValueMap.has(normalized)) continue;
      normalizedValueMap.set(normalized, formatted);
    }

    const pick = (label: string, aliases: string[]): SpecItem | null => {
      for (const alias of aliases) {
        const value = normalizedValueMap.get(normalizeSpecKey(alias));
        if (value) return { label, value };
      }
      return null;
    };

    const curated = [
      pick("Body Style", ["body_style", "body_type", "bodystyle", "body"]),
      pick("Exterior", ["exterior_color", "ext_color", "exterior"]),
      pick("Interior", ["interior_color", "int_color", "interior"]),
      pick("Transmission", ["transmission", "transmission_type"]),
      pick("Drivetrain", ["drivetrain", "drive_type", "drive"]),
      pick("Engine", ["engine", "engine_type"]),
      pick("Fuel", ["fuel_type", "fuel"]),
      pick("Stock #", ["stock_number", "stock_no", "stock"])
    ].filter(Boolean) as SpecItem[];
    if (curated.length > 0) return curated.slice(0, 6);

    const excludedKeys = new Set([
      "vin",
      "year",
      "make",
      "model",
      "trim",
      "price",
      "msrp",
      "monthly",
      "down",
      "discounted"
    ]);

    const fallback: SpecItem[] = [];
    for (const [key, value] of detailEntries) {
      const normalized = normalizeSpecKey(key);
      if (!normalized || excludedKeys.has(normalized)) continue;
      const formatted = formatSpecValue(value);
      if (!formatted) continue;
      const label = key
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      fallback.push({ label, value: formatted });
      if (fallback.length >= 6) break;
    }
    return fallback;
  }, [vehicleQuery.data?.details]);
  const overviewRows = useMemo<SpecItem[]>(() => {
    const rows: SpecItem[] = [];
    const add = (label: string, value: string | undefined) => {
      if (!value) return;
      if (rows.some((row) => row.label === label)) return;
      rows.push({ label, value });
    };

    add("MSRP", formatMoney(vehicleQuery.data?.msrp));
    add("Listed price", formatMoney(vehicleQuery.data?.listed_price));
    add("Discounted", formatMoney(vehicleQuery.data?.discounted));
    add("Down payment", formatMoney(vehicleQuery.data?.down));
    add(
      "Term",
      vehicleQuery.data?.term_months !== undefined && vehicleQuery.data?.term_months !== null
        ? `${vehicleQuery.data.term_months} months`
        : undefined
    );
    add(
      "Miles / year",
      vehicleQuery.data?.miles_per_year !== undefined && vehicleQuery.data?.miles_per_year !== null
        ? vehicleQuery.data.miles_per_year.toLocaleString()
        : undefined
    );
    add(
      "Mileage",
      vehicleQuery.data?.mileage !== undefined && vehicleQuery.data?.mileage !== null
        ? `${vehicleQuery.data.mileage.toLocaleString()} mi`
        : undefined
    );
    add(
      "Condition",
      vehicleQuery.data?.condition
        ? vehicleQuery.data.condition.toString().toUpperCase()
        : isUsed
        ? "USED"
        : undefined
    );

    return rows.slice(0, 8);
  }, [
    vehicleQuery.data?.monthly,
    vehicleQuery.data?.msrp,
    vehicleQuery.data?.listed_price,
    vehicleQuery.data?.discounted,
    vehicleQuery.data?.down,
    vehicleQuery.data?.term_months,
    vehicleQuery.data?.miles_per_year,
    vehicleQuery.data?.mileage,
    vehicleQuery.data?.condition,
    isUsed
  ]);
  const leasePaymentDisclosure = useMemo(() => {
    if (vehicleQuery.data?.monthly === undefined || vehicleQuery.data?.monthly === null) return undefined;
    const leaseBaseText = formatMoney(vehicleQuery.data?.discounted ?? vehicleQuery.data?.msrp);
    const downText = formatMoney(vehicleQuery.data?.down);
    if (leaseBaseText && downText) {
      return `Lease payment is based on offer-sheet MSRP ${leaseBaseText} and down payment ${downText}, not discounted price.`;
    }
    if (leaseBaseText) {
      return `Lease payment is based on offer-sheet MSRP ${leaseBaseText}, not discounted price.`;
    }
    return "Lease payment is based on offer-sheet MSRP and lease structure, not discounted price.";
  }, [vehicleQuery.data?.monthly, vehicleQuery.data?.discounted, vehicleQuery.data?.msrp, vehicleQuery.data?.down]);

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <Card className="tc-fade-up border-ink-200 bg-white">
          <CardContent className="grid gap-6 py-6 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-ink-100">
                  {photos[selectedPhoto] ? (
                    <img
                      src={photos[selectedPhoto]}
                      alt={`${vehicleQuery.data?.year ?? ""} ${vehicleQuery.data?.make ?? ""} ${vehicleQuery.data?.model ?? ""}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                        e.currentTarget.src = DEFAULT_CAR_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-ink-400">No image available</div>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {photos.map((photo, index) => (
                      <button
                        key={photo}
                        type="button"
                        onClick={() => setSelectedPhoto(index)}
                        className={`overflow-hidden rounded-xl border transition ${
                          selectedPhoto === index ? "border-brand-500 ring-2 ring-brand-200" : "border-ink-200"
                        }`}
                        aria-label={`Show image ${index + 1}`}
                      >
                        <img
                          src={photo}
                          alt=""
                          className="h-16 w-full object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                            e.currentTarget.src = DEFAULT_CAR_IMAGE;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-display font-semibold">
                  {vehicleQuery.data?.year} {vehicleQuery.data?.make} {vehicleQuery.data?.model} {vehicleQuery.data?.trim}
                </h1>
                <p className="text-sm text-ink-500">VIN {user ? vin : maskedVin}</p>
              </div>
              <Badge className="w-fit">{badgeLabel}</Badge>
              <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">At a glance</p>
                    <p className="text-sm text-ink-700">
                      {hasOfferSheetData ? "Offer-sheet and key vehicle facts" : "Pricing and key vehicle facts"}
                    </p>
                  </div>
                  {vehicleQuery.data?.monthly !== undefined && vehicleQuery.data?.monthly !== null && (
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Lease payment</p>
                      <p className="text-2xl font-display font-semibold text-ink-900">
                        ${vehicleQuery.data.monthly.toLocaleString()}
                        <span className="ml-1 text-sm font-medium text-ink-600">/mo</span>
                      </p>
                      {leasePaymentDisclosure && <p className="mt-1 max-w-[20rem] text-[11px] leading-snug text-ink-500">{leasePaymentDisclosure}</p>}
                    </div>
                  )}
                </div>
                <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
                  {overviewRows.map((row) => (
                    <div key={`overview-${row.label}`} className="flex items-center justify-between border-b border-ink-100 pb-2 text-sm">
                      <dt className="font-medium text-ink-600">{row.label}</dt>
                      <dd className="font-semibold text-ink-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {detailSpecs.length > 0 && (
                  <details className="border-t border-ink-200">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-700">More vehicle specs</summary>
                    <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
                      {detailSpecs.map((spec) => (
                        <div key={`spec-${spec.label}`} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm">
                          <p className="text-ink-600">{spec.label}</p>
                          <p className="font-medium text-ink-900">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {historyLink && (
                  <div className="border-t border-ink-200 px-4 py-3">
                    <a
                      className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                      href={historyLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View vehicle history
                    </a>
                  </div>
                )}
              </div>
              {!isBrokerUser && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {!isUsed && (
                  <Button asChild className="h-11 justify-center">
                    <Link
                      href={`/credit-application?vin=${encodeURIComponent(vin)}&make=${encodeURIComponent(vehicleQuery.data?.make ?? "")}&model=${encodeURIComponent(vehicleQuery.data?.model ?? "")}&trim=${encodeURIComponent(vehicleQuery.data?.trim ?? "")}`}
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      Apply
                    </Link>
                  </Button>
                )}
                {!isUsed && (
                  <Button
                    variant="outline"
                    className="h-11 justify-center"
                    onClick={() => confirmAvailabilityMutation.mutate()}
                    disabled={confirmAvailabilityMutation.isPending}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    {confirmAvailabilityMutation.isPending ? "Confirming..." : "Confirm Availability"}
                  </Button>
                )}
                <Button asChild variant="outline" className="h-11 justify-center">
                  <Link
                    href={`/credit-application?vin=${encodeURIComponent(vin)}&make=${encodeURIComponent(vehicleQuery.data?.make ?? "")}&model=${encodeURIComponent(vehicleQuery.data?.model ?? "")}&trim=${encodeURIComponent(vehicleQuery.data?.trim ?? "")}`}
                  >
                    <CreditCard className="mr-1 h-4 w-4" />
                    Get Pre-Approved
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 justify-center" onClick={() => favoriteMutation.mutate()}>
                  <Heart className="mr-1 h-4 w-4" />
                  Save favorite
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 justify-center">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Start Deal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pre-verify before starting deal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="Your full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={dealEmail} onChange={(event) => setDealEmail(event.target.value)} placeholder="you@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={dealPhone} onChange={(event) => setDealPhone(event.target.value)} placeholder="(555) 555-5555" />
                    </div>
                    <label className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={dealVerified}
                        onChange={(event) => setDealVerified(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I confirm my contact info is correct for broker follow-up.</span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={dealReadyToProceed}
                        onChange={(event) => setDealReadyToProceed(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I am ready to proceed and want broker support on this deal.</span>
                    </label>
                    <Button
                      onClick={() => dealMutation.mutate()}
                      disabled={
                        !dealName.trim() ||
                        !dealEmail.trim() ||
                        !dealPhone.trim() ||
                        !dealVerified ||
                        !dealReadyToProceed ||
                        dealMutation.isPending
                      }
                    >
                      {dealMutation.isPending ? "Starting..." : "Start Deal"}
                    </Button>
                  </DialogContent>
                </Dialog>
                <LeadFormButton
                  vin={vin}
                  make={vehicleQuery.data?.make ?? ""}
                  model={vehicleQuery.data?.model ?? ""}
                  trim={vehicleQuery.data?.trim ?? ""}
                  year={vehicleQuery.data?.year}
                  source="vehicle_detail_get_price"
                  className="h-11 justify-center"
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Get Price
                </LeadFormButton>
              </div>
              )}
            </div>
            <div className="space-y-5">
              <Card className="tc-fade-up-delay border-ink-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-brand-700" />
                    {hasOfferSheetData || !isUsed ? "Lease offer details" : "Payment estimator"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasOfferSheetData ? (
                    <>
                      <p className="text-sm text-ink-600">Offer-sheet snapshot for this vehicle.</p>
                      <div className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
                        {vehicleQuery.data?.monthly !== undefined && vehicleQuery.data?.monthly !== null ? (
                          <div className="mb-3 rounded-lg border border-brand-200 bg-white px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">Lease payment</p>
                            <p className="text-xl font-display font-semibold text-ink-900">${vehicleQuery.data.monthly.toLocaleString()} /mo</p>
                            {leasePaymentDisclosure && <p className="mt-1 text-[11px] leading-snug text-ink-500">{leasePaymentDisclosure}</p>}
                          </div>
                        ) : null}
                        <dl className="space-y-2 text-sm">
                          {vehicleQuery.data?.down !== undefined && vehicleQuery.data?.down !== null && (
                            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                              <dt className="text-ink-600">Down payment</dt>
                              <dd className="font-semibold text-ink-900">${vehicleQuery.data.down.toLocaleString()}</dd>
                            </div>
                          )}
                          {vehicleQuery.data?.term_months !== undefined && vehicleQuery.data?.term_months !== null && (
                            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                              <dt className="text-ink-600">Term</dt>
                              <dd className="font-semibold text-ink-900">{vehicleQuery.data.term_months} months</dd>
                            </div>
                          )}
                          {vehicleQuery.data?.miles_per_year !== undefined && vehicleQuery.data?.miles_per_year !== null && (
                            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                              <dt className="text-ink-600">Miles / year</dt>
                              <dd className="font-semibold text-ink-900">{vehicleQuery.data.miles_per_year.toLocaleString()}</dd>
                            </div>
                          )}
                          {vehicleQuery.data?.discounted !== undefined && vehicleQuery.data?.discounted !== null && (
                            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                              <dt className="text-ink-600">MSRP</dt>
                              <dd className="font-semibold text-ink-900">${vehicleQuery.data.discounted.toLocaleString()}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      {(vehicleQuery.data?.monthly === undefined || vehicleQuery.data?.monthly === null) && (
                        <p className="text-sm text-ink-600">Monthly payment is not listed for this offer. Please call for details.</p>
                      )}
                    </>
                  ) : !isUsed ? (
                    <p className="text-sm text-ink-600">No offer-sheet lease values found for this vehicle yet.</p>
                  ) : (
                    <>
                      <div className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Quick finance estimate</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Down payment ($)</Label>
                            <Input
                              type="number"
                              value={down}
                              onChange={(e) => setDown(Number(e.target.value))}
                              className="h-10 bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Term (months)</Label>
                            <Input
                              type="number"
                              value={term}
                              onChange={(e) => setTerm(Number(e.target.value))}
                              className="h-10 bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>APR (%)</Label>
                            <Input
                              type="number"
                              value={apr}
                              onChange={(e) => setApr(Number(e.target.value))}
                              step={0.25}
                              className="h-10 bg-white"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Button variant="outline" className="h-10" onClick={() => estimateMutation.mutate()}>
                            Estimate finance
                          </Button>
                          <a
                            href={env.loanCalculatorUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sm font-medium text-brand-600 hover:text-brand-800"
                          >
                            Open full loan calculator {"->"}
                          </a>
                        </div>
                      </div>
                      {estimateMutation.data && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-ink-700">
                          Estimated monthly <span className="font-semibold text-ink-900">${estimateMutation.data.monthly?.toLocaleString()}</span> (down $
                          {estimateMutation.data.down?.toLocaleString()})
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              {!isBrokerUser && (
              <Card className="tc-fade-up-delay border-ink-200 bg-white">
                <CardHeader>
                  <CardTitle>Call For Details and Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-ink-600">
                  <p>Call for details and availability.</p>
                  <p className="font-medium text-ink-800">Ask about our FREE home delivery.</p>
                  <a
                    href="tel:8187059200"
                    className="inline-flex rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:border-brand-300 hover:text-brand-800"
                  >
                    818-705-9200
                  </a>
                </CardContent>
              </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
