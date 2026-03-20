"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, type ManualVehicleRecord, type Vehicle } from "@/lib/api";
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

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizePhotoUrls(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = typeof value === "string" ? value.trim() : "";
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

function inferManualVehicleType(vehicle?: Vehicle | null): "new" | "used" {
  const rawType = (vehicle?.vehicle_type ?? "").toString().toLowerCase();
  const rawCondition = (vehicle?.condition ?? "").toString().toLowerCase();
  if (rawType === "used" || rawCondition === "used" || rawCondition === "cpo") return "used";
  return "new";
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vin = params?.vin as string;
  const { user } = useAuth();
  const vehicleReturnUrl = `/vehicles/${encodeURIComponent(vin ?? "")}`;
  const loginUrl = `/login?returnUrl=${encodeURIComponent(vehicleReturnUrl)}`;
  const normalizedRole = (user?.role ?? "").toLowerCase();
  const isBrokerUser = ["broker", "broker_admin", "admin", "super_admin", "dealer"].includes(normalizedRole);
  const isSuperAdmin = normalizedRole === "super_admin";
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
  const [featuredMonth, setFeaturedMonth] = useState(currentMonthKey());
  const [adminVehicleType, setAdminVehicleType] = useState<"new" | "used">("new");
  const [adminYear, setAdminYear] = useState("");
  const [adminMake, setAdminMake] = useState("");
  const [adminModel, setAdminModel] = useState("");
  const [adminTrim, setAdminTrim] = useState("");
  const [adminListedPrice, setAdminListedPrice] = useState("");
  const [adminMsrp, setAdminMsrp] = useState("");
  const [adminMileage, setAdminMileage] = useState("");
  const [adminCondition, setAdminCondition] = useState("");
  const [adminDealerName, setAdminDealerName] = useState("");
  const [adminDealerPhone, setAdminDealerPhone] = useState("");
  const [adminListingUrl, setAdminListingUrl] = useState("");
  const [adminPhotoUrls, setAdminPhotoUrls] = useState<string[]>([""]);
  const [dragPhotoIndex, setDragPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [adminDownPayment, setAdminDownPayment] = useState("");
  const [adminMonthlyPayment, setAdminMonthlyPayment] = useState("");
  const [adminDiscountedPrice, setAdminDiscountedPrice] = useState("");
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
  const manualVehicleQuery = useQuery({
    queryKey: ["admin-manual-vehicle", vin],
    queryFn: () => api.adminManualVehicles({ q: vin, include_inactive: true, limit: 25 }),
    enabled: isSuperAdmin && !!vin
  });
  const featuredQuery = useQuery({
    queryKey: ["admin-homepage-featured", featuredMonth],
    queryFn: () => api.adminHomepageFeatured({ month: featuredMonth }),
    enabled: isSuperAdmin
  });

  const buildBasicManualPayload = () => {
    const base = vehicleQuery.data;
    if (!base) return null;
    const conditionRaw = (base.condition ?? "").toString().trim().toLowerCase();
    return {
      vehicle_type: inferManualVehicleType(base),
      year: typeof base.year === "number" ? base.year : null,
      make: base.make?.trim() || null,
      model: base.model?.trim() || null,
      trim: base.trim?.trim() || null,
      listed_price: typeof base.listed_price === "number" ? base.listed_price : null,
      msrp: typeof base.msrp === "number" ? base.msrp : null,
      mileage: typeof base.mileage === "number" ? base.mileage : null,
      condition: conditionRaw && conditionRaw !== "all" ? conditionRaw : null,
      dealer_name: base.dealer_name?.trim() || null,
      dealer_phone: base.dealer_phone?.trim() || null,
      listing_url: base.listing_url?.trim() || null,
      photos: normalizePhotoUrls([...(base.photos ?? []), base.photo]),
      down_payment: typeof base.down === "number" ? base.down : null,
      monthly_payment: typeof base.monthly === "number" ? base.monthly : null,
      discounted_price: typeof base.discounted === "number" ? base.discounted : null,
      term_months: typeof base.term_months === "number" ? base.term_months : null,
      miles_per_year: typeof base.miles_per_year === "number" ? base.miles_per_year : null
    };
  };

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
  const upsertManualVehicleMutation = useMutation({
    mutationFn: (payload: {
      vehicle_type: "new" | "used";
      year?: number | null;
      make?: string | null;
      model?: string | null;
      trim?: string | null;
      listed_price?: number | null;
      msrp?: number | null;
      mileage?: number | null;
      condition?: string | null;
      dealer_name?: string | null;
      dealer_phone?: string | null;
      listing_url?: string | null;
      photos?: string[];
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
    }) => api.upsertAdminManualVehicle(vin, payload),
    onSuccess: () => {
      vehicleQuery.refetch();
      manualVehicleQuery.refetch();
      toast({ variant: "success", title: "Vehicle updated", description: "Manual override saved." });
    },
    onError: (error: any) => {
      toast({ variant: "error", title: "Update failed", description: error?.message ?? "Could not update vehicle." });
    }
  });
  const saveBasicManualVehicleMutation = useMutation({
    mutationFn: async () => {
      const payload = buildBasicManualPayload();
      if (!payload) throw new Error("Vehicle data is still loading.");
      return api.upsertAdminManualVehicle(vin, payload);
    },
    onSuccess: () => {
      vehicleQuery.refetch();
      manualVehicleQuery.refetch();
      toast({
        variant: "success",
        title: "Saved to static DB",
        description: "Basic vehicle info was saved to manual inventory and can now be edited."
      });
    },
    onError: (error: any) => {
      toast({ variant: "error", title: "Save failed", description: error?.message ?? "Could not save static vehicle record." });
    }
  });
  const saveBasicAndFeatureMutation = useMutation({
    mutationFn: async () => {
      const payload = buildBasicManualPayload();
      if (!payload) throw new Error("Vehicle data is still loading.");
      const normalizedVin = (vin ?? "").trim().toUpperCase();
      if (!normalizedVin) throw new Error("VIN not found.");

      await api.upsertAdminManualVehicle(vin, payload);
      const featured = await api.adminHomepageFeatured({ month: featuredMonth });
      const currentVins = (featured.vins ?? []).map((item) => item.trim().toUpperCase());
      if (currentVins.includes(normalizedVin)) {
        return { featuredAdded: false };
      }
      if (currentVins.length >= 6) {
        throw new Error(`Featured list for ${featuredMonth} already has 6 vehicles.`);
      }
      await api.setAdminHomepageFeatured({
        month: featuredMonth,
        vins: [...currentVins, normalizedVin]
      });
      return { featuredAdded: true };
    },
    onSuccess: (result) => {
      vehicleQuery.refetch();
      manualVehicleQuery.refetch();
      featuredQuery.refetch();
      toast({
        variant: "success",
        title: result?.featuredAdded ? "Saved and featured" : "Saved to static DB",
        description: result?.featuredAdded
          ? `VIN ${vin} was saved and added to the homepage featured list for ${featuredMonth}.`
          : `VIN ${vin} was saved. It is already featured for ${featuredMonth}.`
      });
    },
    onError: (error: any) => {
      toast({ variant: "error", title: "Action failed", description: error?.message ?? "Could not save and feature vehicle." });
    }
  });
  const addToFeaturedMutation = useMutation({
    mutationFn: async () => {
      const currentVins = (featuredQuery.data?.vins ?? []).map((item) => item.trim().toUpperCase());
      const normalizedVin = (vin ?? "").trim().toUpperCase();
      if (!normalizedVin) throw new Error("VIN not found.");
      if (currentVins.includes(normalizedVin)) {
        return { month: featuredMonth, vins: currentVins, already: true };
      }
      if (currentVins.length >= 6) {
        throw new Error(`Featured list for ${featuredMonth} already has 6 vehicles.`);
      }
      return api.setAdminHomepageFeatured({
        month: featuredMonth,
        vins: [...currentVins, normalizedVin]
      });
    },
    onSuccess: (result: any) => {
      featuredQuery.refetch();
      if (result?.already) {
        toast({ variant: "success", title: "Already featured", description: `VIN ${vin} is already on ${featuredMonth}.` });
        return;
      }
      toast({ variant: "success", title: "Added to landing page", description: `VIN ${vin} added for ${featuredMonth}.` });
    },
    onError: (error: any) => {
      toast({ variant: "error", title: "Could not add featured vehicle", description: error?.message ?? "Please try again." });
    }
  });

  useEffect(() => {
    setDealName(user?.name ?? "");
    setDealEmail(user?.email ?? "");
  }, [user?.name, user?.email]);
  const manualVehicle = useMemo<ManualVehicleRecord | undefined>(() => {
    const items = manualVehicleQuery.data?.items ?? [];
    const normalizedVin = (vin ?? "").trim().toUpperCase();
    return items.find((item) => (item.vin ?? "").trim().toUpperCase() === normalizedVin);
  }, [manualVehicleQuery.data?.items, vin]);

  useEffect(() => {
    if (!isSuperAdmin || !vin) return;
    const source = manualVehicle;
    const base = vehicleQuery.data;
    if (!source && !base) return;

    const vehicleTypeRaw = (source?.vehicle_type ?? base?.vehicle_type ?? "new").toString().toLowerCase();
    setAdminVehicleType(vehicleTypeRaw === "used" ? "used" : "new");
    setAdminYear(source?.year != null ? String(source.year) : base?.year != null ? String(base.year) : "");
    setAdminMake(source?.make ?? base?.make ?? "");
    setAdminModel(source?.model ?? base?.model ?? "");
    setAdminTrim(source?.trim ?? base?.trim ?? "");
    setAdminListedPrice(
      source?.listed_price != null
        ? String(source.listed_price)
        : base?.listed_price != null
        ? String(base.listed_price)
        : ""
    );
    setAdminMsrp(source?.msrp != null ? String(source.msrp) : base?.msrp != null ? String(base.msrp) : "");
    setAdminMileage(source?.mileage != null ? String(source.mileage) : base?.mileage != null ? String(base.mileage) : "");
    setAdminCondition((source?.condition ?? base?.condition ?? "").toString().toLowerCase());
    setAdminDealerName(source?.dealer_name ?? base?.dealer_name ?? "");
    setAdminDealerPhone(source?.dealer_phone ?? base?.dealer_phone ?? "");
    setAdminListingUrl(source?.listing_url ?? base?.listing_url ?? "");
    const photos = Array.isArray(source?.photos) && source.photos.length > 0 ? source.photos : base?.photos ?? [];
    setAdminPhotoUrls(photos.length > 0 ? photos : [""]);
    setAdminDownPayment(source?.down_payment != null ? String(source.down_payment) : base?.down != null ? String(base.down) : "");
    setAdminMonthlyPayment(source?.monthly_payment != null ? String(source.monthly_payment) : base?.monthly != null ? String(base.monthly) : "");
    setAdminDiscountedPrice(
      source?.discounted_price != null
        ? String(source.discounted_price)
        : base?.discounted != null
        ? String(base.discounted)
        : ""
    );
  }, [isSuperAdmin, vin, manualVehicle, vehicleQuery.data]);

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
      const normalizedMessage = rawMessage.toLowerCase();
      const statusCode = Number(error?.status ?? 0);
      const needsLogin =
        statusCode === 401 ||
        statusCode === 403 ||
        normalizedMessage.includes("not authenticated") ||
        normalizedMessage.includes("unauthorized") ||
        normalizedMessage.includes("forbidden") ||
        normalizedMessage.includes("login");
      toast({
        variant: "error",
        title: needsLogin ? "Please login to save your favourite" : "Save failed",
        description: needsLogin ? undefined : (rawMessage || "Unable to save favorite.")
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
    vehicleQuery.data?.down,
    vehicleQuery.data?.term_months,
    vehicleQuery.data?.miles_per_year,
    vehicleQuery.data?.mileage,
    vehicleQuery.data?.condition,
    isUsed
  ]);
  const leasePaymentDisclosure = useMemo(() => {
    if (vehicleQuery.data?.monthly === undefined || vehicleQuery.data?.monthly === null) return undefined;
    const msrpForLease = formatMoney(vehicleQuery.data?.discounted ?? vehicleQuery.data?.msrp);
    if (msrpForLease) {
      return `Lease payment is based on a MSRP ${msrpForLease} vehicle , 1st payment, tax and license fees extra, not everyone will qualify.`;
    }
    return "Lease payment is based on vehicle MSRP, 1st payment, tax and license fees extra, not everyone will qualify.";
  }, [vehicleQuery.data?.monthly, vehicleQuery.data?.discounted, vehicleQuery.data?.msrp]);

  const parseOptionalNumber = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const saveAdminVehicleOverride = () => {
    if (!vin) return;
    upsertManualVehicleMutation.mutate({
      vehicle_type: adminVehicleType,
      year: parseOptionalNumber(adminYear),
      make: adminMake.trim() || null,
      model: adminModel.trim() || null,
      trim: adminTrim.trim() || null,
      listed_price: parseOptionalNumber(adminListedPrice),
      msrp: parseOptionalNumber(adminMsrp),
      mileage: parseOptionalNumber(adminMileage),
      condition: adminCondition.trim() || null,
      dealer_name: adminDealerName.trim() || null,
      dealer_phone: adminDealerPhone.trim() || null,
      listing_url: adminListingUrl.trim() || null,
      photos: adminPhotoUrls
        .map((item) => item.trim())
        .filter(Boolean),
      down_payment: parseOptionalNumber(adminDownPayment),
      monthly_payment: parseOptionalNumber(adminMonthlyPayment),
      discounted_price: parseOptionalNumber(adminDiscountedPrice)
    });
  };

  const updateAdminPhotoUrlAt = (index: number, value: string) => {
    setAdminPhotoUrls((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addAdminPhotoUrlField = () => {
    setAdminPhotoUrls((prev) => [...prev, ""]);
  };

  const removeAdminPhotoUrlField = (index: number) => {
    setAdminPhotoUrls((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const moveAdminPhotoUrl = (fromIndex: number, toIndex: number) => {
    setAdminPhotoUrls((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length || fromIndex === toIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const startPhotoDrag = (index: number) => {
    setDragPhotoIndex(index);
    setDragOverPhotoIndex(index);
  };

  const endPhotoDrag = () => {
    setDragPhotoIndex(null);
    setDragOverPhotoIndex(null);
  };

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
                    onClick={() => {
                      if (!user) {
                        router.push(loginUrl);
                        return;
                      }
                      confirmAvailabilityMutation.mutate();
                    }}
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
                <Button
                  variant="outline"
                  className="h-11 justify-center"
                  onClick={() => {
                    if (!user) {
                      router.push(loginUrl);
                      return;
                    }
                    favoriteMutation.mutate();
                  }}
                >
                  <Heart className="mr-1 h-4 w-4" />
                  Save favorite
                </Button>
                <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                  <Button
                    variant="outline"
                    className="h-11 justify-center"
                    onClick={() => {
                      if (!user) {
                        router.push(loginUrl);
                        return;
                      }
                      setDealDialogOpen(true);
                    }}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Start Deal
                  </Button>
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
                  title="Get My Custom Deal"
                  className="h-11 justify-center text-sm sm:text-base"
                >
                  <MessageSquare className="mr-1 h-4 w-4 shrink-0" />
                  Get My Custom Deal
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
              {isSuperAdmin && (
              <Card className="border-ink-200 bg-white">
                <CardHeader>
                  <CardTitle>Super Admin Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Landing Page Featured</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        type="month"
                        value={featuredMonth}
                        onChange={(event) => setFeaturedMonth(event.target.value || currentMonthKey())}
                        className="max-w-[180px]"
                      />
                      <Button size="sm" variant="outline" onClick={() => featuredQuery.refetch()} disabled={featuredQuery.isFetching}>
                        Refresh
                      </Button>
                      <Button size="sm" onClick={() => addToFeaturedMutation.mutate()} disabled={addToFeaturedMutation.isPending}>
                        Add VIN to Landing Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveBasicManualVehicleMutation.mutate()}
                        disabled={saveBasicManualVehicleMutation.isPending || !vehicleQuery.data}
                      >
                        Save Basic to Static DB
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveBasicAndFeatureMutation.mutate()}
                        disabled={saveBasicAndFeatureMutation.isPending || !vehicleQuery.data}
                      >
                        Save Basic + Feature
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-ink-600">
                      {(() => {
                        const featuredVins = (featuredQuery.data?.vins ?? []).map((item) => item.trim().toUpperCase());
                        const normalizedVin = (vin ?? "").trim().toUpperCase();
                        const inList = featuredVins.includes(normalizedVin);
                        return `${featuredVins.length}/6 selected for ${featuredMonth}${inList ? " | This VIN is already featured." : ""}`;
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Save this live VIN to your internal static database first, then edit photos/pricing below and feature it when needed.
                    </p>
                  </div>

                  <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Edit Vehicle (Manual Override)</p>
                    <p className="mt-1 text-xs text-ink-600">
                      {manualVehicle ? "Manual static record exists for this VIN." : "No manual static record yet. Save basic info above to create one."}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Vehicle type</Label>
                        <div className="flex gap-2">
                          <Button size="sm" variant={adminVehicleType === "new" ? "default" : "outline"} onClick={() => setAdminVehicleType("new")}>
                            New
                          </Button>
                          <Button size="sm" variant={adminVehicleType === "used" ? "default" : "outline"} onClick={() => setAdminVehicleType("used")}>
                            Used
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Year</Label>
                        <Input value={adminYear} onChange={(event) => setAdminYear(event.target.value)} placeholder="2026" />
                      </div>
                      <div className="space-y-1">
                        <Label>Make</Label>
                        <Input value={adminMake} onChange={(event) => setAdminMake(event.target.value)} placeholder="GMC" />
                      </div>
                      <div className="space-y-1">
                        <Label>Model</Label>
                        <Input value={adminModel} onChange={(event) => setAdminModel(event.target.value)} placeholder="Sierra 1500" />
                      </div>
                      <div className="space-y-1">
                        <Label>Trim</Label>
                        <Input value={adminTrim} onChange={(event) => setAdminTrim(event.target.value)} placeholder="Pro" />
                      </div>
                      <div className="space-y-1">
                        <Label>Condition</Label>
                        <select
                          value={adminCondition}
                          onChange={(event) => setAdminCondition(event.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select condition</option>
                          <option value="new">new</option>
                          <option value="used">used</option>
                          <option value="cpo">cpo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Listed price</Label>
                        <Input value={adminListedPrice} onChange={(event) => setAdminListedPrice(event.target.value)} placeholder="54995" />
                      </div>
                      <div className="space-y-1">
                        <Label>MSRP</Label>
                        <Input value={adminMsrp} onChange={(event) => setAdminMsrp(event.target.value)} placeholder="58995" />
                      </div>
                      <div className="space-y-1">
                        <Label>Mileage</Label>
                        <Input value={adminMileage} onChange={(event) => setAdminMileage(event.target.value)} placeholder="10" />
                      </div>
                      <div className="space-y-1">
                        <Label>Dealer name</Label>
                        <Input value={adminDealerName} onChange={(event) => setAdminDealerName(event.target.value)} placeholder="Dealer name" />
                      </div>
                      <div className="space-y-1">
                        <Label>Dealer phone</Label>
                        <Input value={adminDealerPhone} onChange={(event) => setAdminDealerPhone(event.target.value)} placeholder="818-555-1212" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Listing URL</Label>
                        <Input value={adminListingUrl} onChange={(event) => setAdminListingUrl(event.target.value)} placeholder="https://..." />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Photo URLs</Label>
                        <div className="space-y-2">
                          {adminPhotoUrls.map((photoUrl, index) => (
                            <div
                              key={`admin-photo-${index}`}
                              draggable
                              onDragStart={(event) => {
                                startPhotoDrag(index);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(index));
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                if (dragOverPhotoIndex !== index) setDragOverPhotoIndex(index);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const sourceIndex = dragPhotoIndex ?? Number(event.dataTransfer.getData("text/plain"));
                                if (Number.isFinite(sourceIndex)) {
                                  moveAdminPhotoUrl(sourceIndex, index);
                                }
                                endPhotoDrag();
                              }}
                              onDragEnd={endPhotoDrag}
                              className={`grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[64px_88px_1fr_auto] ${
                                dragOverPhotoIndex === index ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-white"
                              }`}
                            >
                              <div
                                className="cursor-grab select-none rounded border border-ink-200 bg-ink-50 px-1 py-2 text-center text-[11px] font-medium text-ink-600 active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                Drag
                              </div>
                              <div className="h-14 w-20 overflow-hidden rounded-md border border-ink-200 bg-white">
                                {photoUrl.trim() ? (
                                  <img
                                    src={photoUrl}
                                    alt={`Photo ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      if (e.currentTarget.src.endsWith(DEFAULT_CAR_IMAGE)) return;
                                      e.currentTarget.src = DEFAULT_CAR_IMAGE;
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-ink-400">No image</div>
                                )}
                              </div>
                              <Input
                                value={photoUrl}
                                onChange={(event) => updateAdminPhotoUrlAt(index, event.target.value)}
                                placeholder={`Photo URL ${index + 1}`}
                              />
                              <Button size="sm" variant="outline" onClick={() => removeAdminPhotoUrlField(index)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" variant="outline" onClick={addAdminPhotoUrlField}>
                          Add photo URL
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label>Down payment</Label>
                        <Input value={adminDownPayment} onChange={(event) => setAdminDownPayment(event.target.value)} placeholder="3000" />
                      </div>
                      <div className="space-y-1">
                        <Label>Monthly payment</Label>
                        <Input value={adminMonthlyPayment} onChange={(event) => setAdminMonthlyPayment(event.target.value)} placeholder="499" />
                      </div>
                      <div className="space-y-1">
                        <Label>Discounted / MSRP value</Label>
                        <Input value={adminDiscountedPrice} onChange={(event) => setAdminDiscountedPrice(event.target.value)} placeholder="54995" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={saveAdminVehicleOverride} disabled={upsertManualVehicleMutation.isPending}>
                        Save Vehicle Override
                      </Button>
                      <Button variant="outline" onClick={() => manualVehicleQuery.refetch()} disabled={manualVehicleQuery.isFetching}>
                        Reload Override
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
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
