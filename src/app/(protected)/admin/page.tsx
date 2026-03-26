"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Deal, type LeadDeliveryRecord, type ManualVehicleRecord, type SeoPageSettingRecord, type Vehicle } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/components/auth-provider";
import { ExternalLink, MessageCircle } from "lucide-react";
import { LandingPageEditor } from "@/components/admin/landing-page-editor";
import UserManagement from "@/components/admin/user-management";
import { CreditUnionsManager } from "@/components/admin/credit-unions-manager";
import { AdminSuperAdminToolbar } from "@/components/admin/admin-super-admin-toolbar";
import { type SeoSettingsCardProps } from "@/components/admin/seo-settings-card";
import { AdminSuperAdminDataPanel } from "@/components/admin/admin-super-admin-data-panel";
import { AdminBrokerAdminDataPanel } from "@/components/admin/admin-broker-admin-data-panel";
import { AdminLeadDeliveryPanel } from "@/components/admin/admin-lead-delivery-panel";
import { AdminCreditAndDocsPanel } from "@/components/admin/admin-credit-and-docs-panel";
import { AdminBrokerOpsPanel } from "@/components/admin/admin-broker-ops-panel";

type ManualVehicleUpsertPayload = {
  vehicle_type?: "new" | "used";
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  msrp?: number | null;
  listed_price?: number | null;
  mileage?: number | null;
  condition?: string | null;
  photos?: string[];
  details?: Record<string, unknown> | null;
  dealer_name?: string | null;
  dealer_phone?: string | null;
  listing_url?: string | null;
  carfax_url?: string | null;
  down_payment?: number | null;
  monthly_payment?: number | null;
  discounted_price?: number | null;
  term_months?: number | null;
  miles_per_year?: number | null;
};

function normalizePhotos(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toManualPayloadFromVehicle(vehicle: Vehicle | undefined): ManualVehicleUpsertPayload {
  const conditionRaw = (vehicle?.condition ?? "").toString().trim().toLowerCase();
  return {
    vehicle_type: (vehicle?.vehicle_type ?? "new") === "used" ? "used" : "new",
    year: typeof vehicle?.year === "number" ? vehicle.year : null,
    make: vehicle?.make?.trim() || null,
    model: vehicle?.model?.trim() || null,
    trim: vehicle?.trim?.trim() || null,
    listed_price: numberOrNull(vehicle?.listed_price),
    msrp: numberOrNull(vehicle?.msrp),
    mileage: typeof vehicle?.mileage === "number" ? vehicle.mileage : null,
    condition: conditionRaw && conditionRaw !== "all" ? conditionRaw : null,
    dealer_name: vehicle?.dealer_name?.trim() || null,
    dealer_phone: vehicle?.dealer_phone?.trim() || null,
    listing_url: vehicle?.listing_url?.trim() || null,
    carfax_url: vehicle?.vehicle_history_url?.trim() || vehicle?.history_url?.trim() || null,
    photos: normalizePhotos([...(vehicle?.photos ?? []), vehicle?.photo]),
    down_payment: numberOrNull(vehicle?.down),
    monthly_payment: numberOrNull(vehicle?.monthly),
    discounted_price: numberOrNull(vehicle?.discounted),
    term_months: typeof vehicle?.term_months === "number" ? vehicle.term_months : null,
    miles_per_year: typeof vehicle?.miles_per_year === "number" ? vehicle.miles_per_year : null
  };
}

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isBrokerWorkspace = !isSuperAdmin;
  const { toast } = useToast();
  const [lenderName, setLenderName] = useState("Default Lender");
  const [creditTier, setCreditTier] = useState("B");
  const [vehicleType, setVehicleType] = useState("all");
  const [apr, setApr] = useState("5.0");
  const [maxTerm, setMaxTerm] = useState("72");

  const [assignBrokerEmails, setAssignBrokerEmails] = useState<Record<number, string>>({});
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const [scheduleAddress, setScheduleAddress] = useState<Record<number, string>>({});
  const [expandedDealId, setExpandedDealId] = useState<number | null>(null);
  const [highlightedDealId, setHighlightedDealId] = useState<number | null>(null);
  const [dealSearch, setDealSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [brokerReplyByThread, setBrokerReplyByThread] = useState<Record<string, string>>({});
  const [creditStatusFilter, setCreditStatusFilter] = useState("all");
  const [creditSearch, setCreditSearch] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [creditNotes, setCreditNotes] = useState<Record<number, string>>({});
  const [docNotes, setDocNotes] = useState<Record<number, string>>({});
  const [offerSourceFilter, setOfferSourceFilter] = useState<"all" | "sheet" | "dealer" | "broker">("all");
  const [offerSearch, setOfferSearch] = useState("");
  const [offerYear, setOfferYear] = useState("");
  const [offerMake, setOfferMake] = useState("");
  const [offerModel, setOfferModel] = useState("");
  const [offerVehicleType, setOfferVehicleType] = useState<"all" | "new" | "used">("all");
  const [offerVin, setOfferVin] = useState("");
  const [offerDownPayment, setOfferDownPayment] = useState("");
  const [offerMonthlyPayment, setOfferMonthlyPayment] = useState("");
  const [offerDiscountedPrice, setOfferDiscountedPrice] = useState("");
  const [offerTermMonths, setOfferTermMonths] = useState("");
  const [offerMilesPerYear, setOfferMilesPerYear] = useState("");
  const [featuredMonth, setFeaturedMonth] = useState(currentMonthKey());
  const [featuredVinInput, setFeaturedVinInput] = useState("");
  const [featuredVinsDraft, setFeaturedVinsDraft] = useState<string[]>([]);
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualVin, setManualVin] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualMake, setManualMake] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualTrim, setManualTrim] = useState("");
  const [manualVehicleType, setManualVehicleType] = useState<"new" | "used">("new");
  const [manualListedPrice, setManualListedPrice] = useState("");
  const [manualMsrp, setManualMsrp] = useState("");
  const [manualMileage, setManualMileage] = useState("");
  const [manualCondition, setManualCondition] = useState("");
  const [manualDealerName, setManualDealerName] = useState("");
  const [manualDealerPhone, setManualDealerPhone] = useState("");
  const [manualListingUrl, setManualListingUrl] = useState("");
  const [manualPhotoUrls, setManualPhotoUrls] = useState<string[]>([""]);
  const [manualDownPayment, setManualDownPayment] = useState("");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");
  const [manualDiscountedPrice, setManualDiscountedPrice] = useState("");
  const [seoPageKey, setSeoPageKey] = useState<string>("home");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState("");
  const [seoOgTitle, setSeoOgTitle] = useState("");
  const [seoOgDescription, setSeoOgDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [seoRobots, setSeoRobots] = useState("index,follow");
  const [seoJsonLd, setSeoJsonLd] = useState("{}");
  const [seoJsonLdPresetId, setSeoJsonLdPresetId] = useState("_");
  const [seoIsActive, setSeoIsActive] = useState(true);
  const [leadDeliveryStatusFilter, setLeadDeliveryStatusFilter] = useState<"all" | "pending" | "sent" | "failed" | "skipped">("all");
  const [leadDeliverySearch, setLeadDeliverySearch] = useState("");
  const [adminTab, setAdminTab] = useState<"broker_ops" | "credit_docs" | "leads" | "admin_data" | "landing_page" | "credit_unions" | "users">("broker_ops");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  });
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const dealPipelineRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLElement>(null);
  const docsQueueRef = useRef<HTMLDivElement>(null);
  const manualVehicleControlRef = useRef<HTMLDivElement>(null);
  const normalizedSeoPageKey = seoPageKey.trim().toLowerCase();
  const isValidSeoPageKey = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalizedSeoPageKey);

  const sourcesQuery = useQuery({
    queryKey: ["admin-sources"],
    queryFn: api.adminSources,
    enabled: isBrokerWorkspace
  });
  const statusQuery = useQuery({
    queryKey: ["admin-sync-status"],
    queryFn: api.syncStatus,
    enabled: isBrokerWorkspace
  });
  const generalStatusQuery = useQuery({
    queryKey: ["admin-general-status"],
    queryFn: api.adminGeneralStatus,
    enabled: isSuperAdmin
  });
  const homepageFeaturedQuery = useQuery({
    queryKey: ["admin-homepage-featured", featuredMonth],
    queryFn: () => api.adminHomepageFeatured({ month: featuredMonth }),
    enabled: isSuperAdmin
  });
  const manualVehiclesQuery = useQuery({
    queryKey: ["admin-manual-vehicles", manualSearch],
    queryFn: () => api.adminManualVehicles({ q: manualSearch || undefined, limit: 200 }),
    enabled: isSuperAdmin
  });
  const seoSettingsQuery = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: () => api.adminSeoSettings({ include_inactive: true, limit: 200 }),
    enabled: isSuperAdmin
  });
  const seoSettingQuery = useQuery({
    queryKey: ["admin-seo-setting", normalizedSeoPageKey],
    queryFn: () => api.adminSeoSetting(normalizedSeoPageKey),
    enabled: isSuperAdmin && isValidSeoPageKey && normalizedSeoPageKey.length > 0,
    retry: false
  });
  const leadDeliveryQuery = useQuery({
    queryKey: ["admin-lead-delivery", leadDeliveryStatusFilter, leadDeliverySearch],
    queryFn: () =>
      api.adminLeadDelivery({
        status: leadDeliveryStatusFilter === "all" ? undefined : leadDeliveryStatusFilter,
        q: leadDeliverySearch || undefined,
        limit: 200
      }),
    enabled: isBrokerWorkspace || isSuperAdmin
  });
  const dealsQuery = useQuery({ queryKey: ["admin-deals-queue"], queryFn: api.brokerQueue, enabled: isBrokerWorkspace });
  const messagesQuery = useQuery({ queryKey: ["admin-messages"], queryFn: api.messages, enabled: isBrokerWorkspace });
  const lenderRatesQuery = useQuery({ queryKey: ["admin-lender-rates"], queryFn: api.lenderRates, enabled: isBrokerWorkspace });
  const offerOverridesQuery = useQuery({
    queryKey: ["admin-offer-overrides", offerSourceFilter, offerSearch],
    queryFn: () =>
      api.adminOfferOverrides({
        source: offerSourceFilter === "all" ? undefined : offerSourceFilter,
        q: offerSearch || undefined,
        limit: 200
      }),
    enabled: isBrokerWorkspace
  });
  const creditApplicationsQuery = useQuery({
    queryKey: ["admin-credit-applications", creditStatusFilter, creditSearch],
    queryFn: () =>
      api.brokerCreditApplications({
        status: creditStatusFilter === "all" ? undefined : creditStatusFilter,
        q: creditSearch || undefined,
        page_size: 50
      }),
    enabled: isBrokerWorkspace || isSuperAdmin
  });
  const docSubmissionsQuery = useQuery({
    queryKey: ["admin-doc-submissions", docStatusFilter, docSearch],
    queryFn: () =>
      api.brokerDocSubmissions({
        status: docStatusFilter === "all" ? undefined : docStatusFilter,
        q: docSearch || undefined,
        page_size: 50
      }),
    enabled: isBrokerWorkspace || isSuperAdmin
  });
  const dealEventsQuery = useQuery({
    queryKey: ["admin-deal-events", expandedDealId],
    queryFn: () => api.dealEvents(expandedDealId as number),
    enabled: isBrokerWorkspace && expandedDealId !== null
  });

  const syncMutation = useMutation({
    mutationFn: api.syncSheets,
    onSuccess: () => {
      sourcesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Sheets synced" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Sync failed", description: errorMessage(err, "Could not sync sheets.") })
  });
  const retryLeadDeliveryMutation = useMutation({
    mutationFn: (leadId: number) => api.adminRetryLeadDelivery(leadId),
    onSuccess: () => {
      leadDeliveryQuery.refetch();
      toast({ variant: "success", title: "Lead retry queued" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Retry failed", description: errorMessage(err, "Could not queue lead retry.") })
  });

  const updateDealMutation = useMutation({
    mutationFn: (payload: { dealId: number; status: string }) => api.updateDeal(payload.dealId, { status: payload.status }),
    onSuccess: () => {
      dealsQuery.refetch();
      toast({ variant: "success", title: "Deal updated" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Deal update failed", description: errorMessage(err, "Could not update deal status.") })
  });

  const saveDealMetaMutation = useMutation({
    mutationFn: (payload: { dealId: number; assigned_broker_email?: string; delivery_scheduled_at?: string; delivery_address?: string }) =>
      api.updateDeal(payload.dealId, {
        assigned_broker_email: payload.assigned_broker_email,
        delivery_scheduled_at: payload.delivery_scheduled_at,
        delivery_address: payload.delivery_address
      }),
    onSuccess: () => {
      dealsQuery.refetch();
      toast({ variant: "success", title: "Deal details saved" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save deal details.") })
  });

  const createRateMutation = useMutation({
    mutationFn: () =>
      api.createLenderRate({
        lender_name: lenderName.trim(),
        credit_tier: creditTier.trim().toUpperCase(),
        vehicle_type: vehicleType.trim().toLowerCase(),
        apr: Number(apr),
        max_term_months: Number(maxTerm)
      }),
    onSuccess: () => {
      lenderRatesQuery.refetch();
      toast({ variant: "success", title: "Rate added" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Could not add rate", description: errorMessage(err, "Invalid rate payload.") })
  });
  const upsertOfferOverrideMutation = useMutation({
    mutationFn: (payload: {
      vin: string;
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }) =>
      api.upsertAdminOfferOverride(payload.vin, {
        down_payment: payload.down_payment,
        monthly_payment: payload.monthly_payment,
        discounted_price: payload.discounted_price,
        term_months: payload.term_months,
        miles_per_year: payload.miles_per_year
      }),
    onSuccess: () => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Lease special saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save lease special.") })
  });
  const upsertOfferOverrideByYmmMutation = useMutation({
    mutationFn: (payload: {
      year: number;
      make: string;
      model: string;
      vehicle_type?: "all" | "new" | "used";
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }) =>
      api.upsertAdminOfferOverrideByYmm(payload),
    onSuccess: (result) => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({
        variant: "success",
        title: "Lease specials saved",
        description: `${result.updated_count} vehicles updated for ${result.year} ${result.make} ${result.model}`
      });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save lease specials for Y/M/M.") })
  });
  const deleteOfferOverrideMutation = useMutation({
    mutationFn: (vin: string) => api.deleteAdminOfferOverride(vin),
    onSuccess: () => {
      offerOverridesQuery.refetch();
      statusQuery.refetch();
      toast({ variant: "success", title: "Lease special removed" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not remove lease special.") })
  });
  const saveHomepageFeaturedMutation = useMutation({
    mutationFn: (vins: string[]) => api.setAdminHomepageFeatured({ month: featuredMonth, vins }),
    onSuccess: (result) => {
      setFeaturedDirty(false);
      setFeaturedVinsDraft(result.vins ?? []);
      homepageFeaturedQuery.refetch();
      toast({
        variant: "success",
        title: "Homepage featured cars saved",
        description: `${result.vins?.length ?? 0} vehicles selected for ${result.month}.`
      });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save homepage featured cars.") })
  });
  const upsertManualVehicleMutation = useMutation({
    mutationFn: (payload: ManualVehicleUpsertPayload & { vin: string; vehicle_type: "new" | "used" }) =>
      api.upsertAdminManualVehicle(payload.vin, {
        vehicle_type: payload.vehicle_type,
        year: payload.year,
        make: payload.make,
        model: payload.model,
        trim: payload.trim,
        msrp: payload.msrp,
        listed_price: payload.listed_price,
        mileage: payload.mileage,
        condition: payload.condition,
        dealer_name: payload.dealer_name,
        dealer_phone: payload.dealer_phone,
        listing_url: payload.listing_url,
        photos: payload.photos,
        down_payment: payload.down_payment,
        monthly_payment: payload.monthly_payment,
        discounted_price: payload.discounted_price
      }),
    onSuccess: () => {
      manualVehiclesQuery.refetch();
      homepageFeaturedQuery.refetch();
      toast({ variant: "success", title: "Manual vehicle saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save manual vehicle.") })
  });
  const uploadManualVehiclePhotoMutation = useMutation({
    mutationFn: (file: File) => api.uploadAdminManualVehiclePhoto(file),
    onSuccess: (result) => {
      const uploadedUrl = (result.url ?? "").trim();
      if (!uploadedUrl) {
        toast({ variant: "error", title: "Upload failed", description: "No image URL was returned." });
        return;
      }
      setManualPhotoUrls((prev) => {
        const next = [...prev];
        const emptyIndex = next.findIndex((value) => !value.trim());
        if (emptyIndex >= 0) {
          next[emptyIndex] = uploadedUrl;
        } else {
          next.push(uploadedUrl);
        }
        const cleaned = normalizePhotos(next);
        return cleaned.length > 0 ? cleaned : [""];
      });
      toast({ variant: "success", title: "Photo uploaded" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Upload failed", description: errorMessage(err, "Could not upload image.") })
  });
  const deleteManualVehicleMutation = useMutation({
    mutationFn: (vin: string) => api.deleteAdminManualVehicle(vin),
    onSuccess: () => {
      manualVehiclesQuery.refetch();
      homepageFeaturedQuery.refetch();
      toast({ variant: "success", title: "Manual vehicle deleted" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not delete manual vehicle.") })
  });
  const saveInventoryVinToManualMutation = useMutation({
    mutationFn: async ({ vin }: { vin: string }) => {
      const vehicle = await api.getVehicle(vin);
      const payload = toManualPayloadFromVehicle(vehicle);
      return api.upsertAdminManualVehicle(vin, payload);
    },
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not load VIN",
        description: errorMessage(err, "Could not save this VIN into Manual Vehicle Control.")
      })
  });

  const generalStatus = generalStatusQuery.data;
  const activeDealerCount = generalStatus?.dealers.active_count;
  const activeNewCount = generalStatus?.vehicles.active_new_count;
  const activeUsedCount = generalStatus?.vehicles.active_used_count;
  const activeTotalCount = generalStatus?.vehicles.active_total_count;
  const upsertSeoSettingMutation = useMutation({
    mutationFn: (payload: {
      pageKey: string;
      body: {
        title?: string | null;
        description?: string | null;
        keywords?: string | null;
        canonical_url?: string | null;
        og_title?: string | null;
        og_description?: string | null;
        og_image_url?: string | null;
        robots?: string | null;
        json_ld?: unknown;
        is_active?: boolean;
      };
    }) => api.upsertAdminSeoSetting(payload.pageKey, payload.body),
    onSuccess: () => {
      seoSettingsQuery.refetch();
      seoSettingQuery.refetch();
      toast({ variant: "success", title: "SEO setting saved" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Save failed", description: errorMessage(err, "Could not save SEO setting.") })
  });
  const deleteSeoSettingMutation = useMutation({
    mutationFn: (pageKey: string) => api.deleteAdminSeoSetting(pageKey),
    onSuccess: () => {
      seoSettingsQuery.refetch();
      seoSettingQuery.refetch();
      toast({ variant: "success", title: "SEO setting deleted" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Delete failed", description: errorMessage(err, "Could not delete SEO setting.") })
  });

  const sendBrokerReplyMutation = useMutation({
    mutationFn: (payload: { customer_user_id: number; vin?: string; message: string }) => api.sendBrokerReply(payload),
    onSuccess: (_data, variables) => {
      const key = `${variables.customer_user_id}|${variables.vin ?? ""}`;
      setBrokerReplyByThread((prev) => ({ ...prev, [key]: "" }));
      messagesQuery.refetch();
      toast({ variant: "success", title: "Reply sent" });
    },
    onError: (err: unknown) => toast({ variant: "error", title: "Reply failed", description: errorMessage(err, "Could not send reply.") })
  });

  const updateCreditApplicationMutation = useMutation({
    mutationFn: (payload: { id: number; status?: string; broker_note?: string }) =>
      api.updateBrokerCreditApplication(payload.id, { status: payload.status, broker_note: payload.broker_note }),
    onSuccess: () => {
      creditApplicationsQuery.refetch();
      toast({ variant: "success", title: "Credit application updated" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Update failed", description: errorMessage(err, "Could not update credit application.") })
  });

  const updateDocSubmissionMutation = useMutation({
    mutationFn: (payload: { id: number; status?: string; broker_note?: string }) =>
      api.updateBrokerDocSubmission(payload.id, { status: payload.status, broker_note: payload.broker_note }),
    onSuccess: () => {
      docSubmissionsQuery.refetch();
      toast({ variant: "success", title: "Document submission updated" });
    },
    onError: (err: unknown) =>
      toast({ variant: "error", title: "Update failed", description: errorMessage(err, "Could not update document submission.") })
  });

  const deals = dealsQuery.data?.items ?? [];
  const offerOverrides = offerOverridesQuery.data?.items ?? [];
  const homepageFeaturedItems = homepageFeaturedQuery.data?.items ?? [];
  const homepageFeaturedLimit = homepageFeaturedQuery.data?.max_items ?? 6;
  const manualVehicles: ManualVehicleRecord[] = manualVehiclesQuery.data?.items ?? [];
  const seoSettings: SeoPageSettingRecord[] = seoSettingsQuery.data?.items ?? [];
  const seoSettingErrorStatus = (seoSettingQuery.error as { status?: number } | null)?.status;
  const leadDeliveryItems: LeadDeliveryRecord[] = leadDeliveryQuery.data?.items ?? [];
  const featuredSummaryByVin = useMemo(() => {
    const map: Record<string, (typeof homepageFeaturedItems)[number]["vehicle"]> = {};
    for (const item of homepageFeaturedItems) {
      if (!item.vin) continue;
      map[item.vin] = item.vehicle;
    }
    return map;
  }, [homepageFeaturedItems]);
  const offerOverrideByVin = useMemo(() => {
    const map: Record<string, (typeof offerOverrides)[number]> = {};
    for (const item of offerOverrides) {
      if (!item.vin) continue;
      map[item.vin] = item;
    }
    return map;
  }, [offerOverrides]);
  const creditApplications = creditApplicationsQuery.data?.items ?? [];
  const docSubmissions = docSubmissionsQuery.data?.items ?? [];
  const latestDocByDealKey = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of docSubmissions) {
      const key = `${row.user_id}|${row.vin ?? ""}`;
      const current = map[key];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[key] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [docSubmissions]);
  const latestDocByVin = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of docSubmissions) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [docSubmissions]);
  const latestCreditByDealKey = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of creditApplications) {
      if (!row.user_id) continue;
      const key = `${row.user_id}|${row.vin ?? ""}`;
      const current = map[key];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[key] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [creditApplications]);
  const latestCreditByVin = useMemo(() => {
    const map: Record<string, { id?: number; status?: string | null; created_at?: string | null }> = {};
    for (const row of creditApplications) {
      if (!row.vin) continue;
      const current = map[row.vin];
      const currentMs = current?.created_at ? Date.parse(current.created_at) : 0;
      const nextMs = row.created_at ? Date.parse(row.created_at) : 0;
      if (!current || nextMs >= currentMs) {
        map[row.vin] = { id: row.id, status: row.status, created_at: row.created_at };
      }
    }
    return map;
  }, [creditApplications]);
  const pendingCreditCount = creditApplications.filter((item) => (item.status ?? "submitted") === "submitted").length;
  const pendingDocCount = docSubmissions.filter((item) => (item.status ?? "submitted") === "submitted").length;
  const totalDeals = deals.length;

  const threads = useMemo(() => {
    const items = messagesQuery.data?.items ?? [];
    const grouped = new Map<string, { key: string; userId: string; vin?: string; customerName?: string | null; customerEmail?: string | null; items: typeof items }>();
    for (const m of items) {
      if (!m.userId) continue;
      const key = `${m.userId}|${m.vin ?? ""}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.items.push(m);
      } else {
        grouped.set(key, {
          key,
          userId: m.userId,
          vin: m.vin,
          customerName: m.customerName,
          customerEmail: m.customerEmail,
          items: [m]
        });
      }
    }
    const list = Array.from(grouped.values()).map((t) => ({
      ...t,
      items: [...t.items].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
    }));
    const enriched = list.map((thread) => {
      const lastMessage = thread.items[thread.items.length - 1];
      const lastAt = lastMessage?.createdAt ?? "";
      const lastSenderType = (lastMessage?.senderType ?? "").toLowerCase();
      const customerMessageCount = thread.items.filter((m) => (m.senderType ?? "").toLowerCase() !== "broker").length;
      const brokerMessageCount = thread.items.filter((m) => (m.senderType ?? "").toLowerCase() === "broker").length;
      const needsReply = thread.items.length > 0 && lastSenderType !== "broker";

      return {
        ...thread,
        lastAt,
        lastSenderType,
        needsReply,
        customerMessageCount,
        brokerMessageCount
      };
    });
    enriched.sort((a, b) => {
      if (a.needsReply && !b.needsReply) return -1;
      if (!a.needsReply && b.needsReply) return 1;
      return b.lastAt.localeCompare(a.lastAt);
    });
    return enriched;
  }, [messagesQuery.data?.items]);

  const vehicleVins = useMemo(() => {
    const set = new Set<string>();
    for (const deal of deals) {
      if (deal.vin) set.add(deal.vin);
    }
    for (const thread of threads) {
      if (thread.vin) set.add(thread.vin);
    }
    for (const vin of featuredVinsDraft) {
      if (vin) set.add(vin);
    }
    for (const item of homepageFeaturedItems) {
      if (item.vin) set.add(item.vin);
    }
    return Array.from(set).sort();
  }, [deals, threads, featuredVinsDraft, homepageFeaturedItems]);

  const vehiclesByVinQuery = useQuery({
    queryKey: ["admin-vehicles-by-vin", vehicleVins.join("|")],
    enabled: vehicleVins.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        vehicleVins.map(async (vin) => {
          try {
            const vehicle = await api.getVehicle(vin);
            return [vin, vehicle] as const;
          } catch {
            return [vin, { vin }] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, Vehicle>;
    }
  });

  const vehiclesByVin = vehiclesByVinQuery.data ?? {};

  useEffect(() => {
    if (featuredDirty) return;
    setFeaturedVinsDraft(homepageFeaturedQuery.data?.vins ?? []);
  }, [homepageFeaturedQuery.data?.month, homepageFeaturedQuery.data?.vins, featuredDirty]);

  useEffect(() => {
    if (!highlightedDealId) return;
    const timeout = setTimeout(() => setHighlightedDealId(null), 3000);
    return () => clearTimeout(timeout);
  }, [highlightedDealId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!isValidSeoPageKey || !normalizedSeoPageKey) return;

    const row = seoSettingQuery.data;
    if (row && row.page_key === normalizedSeoPageKey) {
      setSeoTitle(row.title ?? "");
      setSeoDescription(row.description ?? "");
      setSeoKeywords(row.keywords ?? "");
      setSeoCanonicalUrl(row.canonical_url ?? "");
      setSeoOgTitle(row.og_title ?? "");
      setSeoOgDescription(row.og_description ?? "");
      setSeoOgImageUrl(row.og_image_url ?? "");
      setSeoRobots(row.robots ?? "index,follow");
      setSeoJsonLd(prettyJson(row.json_ld ?? {}));
      setSeoJsonLdPresetId("_");
      setSeoIsActive(row.is_active !== false);
      return;
    }

    const err = seoSettingQuery.error as { status?: number } | null;
    if (err?.status === 404) {
      setSeoTitle("");
      setSeoDescription("");
      setSeoKeywords("");
      setSeoCanonicalUrl("");
      setSeoOgTitle("");
      setSeoOgDescription("");
      setSeoOgImageUrl("");
      setSeoRobots("index,follow");
      setSeoJsonLd("{}");
      setSeoJsonLdPresetId("_");
      setSeoIsActive(true);
    }
  }, [isSuperAdmin, isValidSeoPageKey, normalizedSeoPageKey, seoSettingQuery.data, seoSettingQuery.error]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (adminTab === "broker_ops") {
      setAdminTab("admin_data");
    }
  }, [isSuperAdmin, adminTab]);

  const confirmAction = (title: string, onConfirm: () => void, description = "Please confirm this broker action.") => {
    setConfirmState({
      open: true,
      title,
      description,
      onConfirm
    });
  };

  const focusConversationForDeal = (deal: Deal) => {
    const exactKey = `${deal.user_id}|${deal.vin ?? ""}`;
    const userPrefix = `${deal.user_id}|`;
    const exact = threads.find((thread) => thread.key === exactKey);
    const fallback = threads.find((thread) => thread.key.startsWith(userPrefix));
    const target = exact ?? fallback;
    if (target) {
      setSelectedThreadKey(target.key);
    }
    setTimeout(() => {
      conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const focusDealInPipeline = (deal: Deal) => {
    setStatusFilter("all");
    setDealSearch(deal.vin);
    setHighlightedDealId(deal.id);
    setTimeout(() => {
      const target = document.getElementById(`deal-card-${deal.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        dealPipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  };

  const openDocsQueueForVin = (vin: string) => {
    setAdminTab("credit_docs");
    setDocSearch(vin);
    setTimeout(() => {
      docsQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };
  const openCreditQueueForVin = (vin: string) => {
    setAdminTab("credit_docs");
    setCreditSearch(vin);
    setTimeout(() => {
      docsQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const requestDocsForDeal = (deal: Deal) => {
    confirmAction(
      `Send a document request to customer for VIN ${deal.vin}?`,
      () =>
        sendBrokerReplyMutation.mutate({
          customer_user_id: deal.user_id,
          vin: deal.vin,
          message: `Please upload your required documents for VIN ${deal.vin} (driver license and insurance) so we can continue your deal.`
        }),
      "This sends a broker message to the customer."
    );
  };
  const requestCreditForDeal = (deal: Deal) => {
    confirmAction(
      `Send a credit application request to customer for VIN ${deal.vin}?`,
      () =>
        sendBrokerReplyMutation.mutate({
          customer_user_id: deal.user_id,
          vin: deal.vin,
          message: `Please complete your credit application for VIN ${deal.vin}. Use the Credit Application form so we can continue your deal.`
        }),
      "This sends a broker message to the customer."
    );
  };

  const setDocStatusForDeal = (submissionId: number, status: string) => {
    confirmAction(
      `Set document status to ${status.replaceAll("_", " ")}?`,
      () => updateDocSubmissionMutation.mutate({ id: submissionId, status }),
      "This updates document verification status in broker and customer views."
    );
  };
  const setCreditStatusForDeal = (applicationId: number, status: string) => {
    confirmAction(
      `Set credit status to ${status.replaceAll("_", " ")}?`,
      () => updateCreditApplicationMutation.mutate({ id: applicationId, status }),
      "This updates credit review status in broker and customer views."
    );
  };

  const toggleLeaseSpecialForDeal = (deal: Deal, vehicle?: Vehicle) => {
    const existing = offerOverrideByVin[deal.vin];
    if (existing?.source && existing.source !== "broker") {
      toast({
        variant: "success",
        title: `Already in Lease Specials (${existing.source})`
      });
      return;
    }
    if (existing?.source === "broker") {
      confirmAction(
        `Remove VIN ${deal.vin} from Lease Specials?`,
        () => deleteOfferOverrideMutation.mutate(deal.vin),
        "This removes your broker override special."
      );
      return;
    }

    confirmAction(
      `Add VIN ${deal.vin} to Lease Specials?`,
      () =>
        upsertOfferOverrideMutation.mutate({
          vin: deal.vin,
          down_payment: vehicle?.down ?? null,
          monthly_payment: vehicle?.monthly ?? null,
          discounted_price: vehicle?.discounted ?? vehicle?.listed_price ?? vehicle?.msrp ?? null,
          term_months: vehicle?.term_months ?? null,
          miles_per_year: vehicle?.miles_per_year ?? null
        }),
      "This creates a broker lease special override for this VIN."
    );
  };

  const scrollToManualVehicleControl = () => {
    setAdminTab("admin_data");
    setTimeout(() => {
      manualVehicleControlRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const addVinToFeaturedDraft = (vin: string): "added" | "already" | "full" => {
    const normalizedVin = vin.trim().toUpperCase();
    if (!normalizedVin) return "already";
    if (featuredVinsDraft.includes(normalizedVin)) return "already";
    if (featuredVinsDraft.length >= homepageFeaturedLimit) return "full";
    setFeaturedVinsDraft((prev) => [...prev, normalizedVin]);
    setFeaturedDirty(true);
    return "added";
  };

  const addHomepageFeaturedVin = () => {
    const vin = featuredVinInput.trim().toUpperCase();
    if (!vin) return;
    if (vin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }
    const result = addVinToFeaturedDraft(vin);
    if (result === "already") {
      toast({ variant: "error", title: "Already selected", description: `${vin} is already in the featured list.` });
      return;
    }
    if (result === "full") {
      toast({
        variant: "error",
        title: "List full",
        description: `You can select up to ${homepageFeaturedLimit} homepage featured cars.`
      });
      return;
    }
    setFeaturedVinInput("");
  };

  const removeHomepageFeaturedVin = (vin: string) => {
    setFeaturedVinsDraft((prev) => prev.filter((item) => item !== vin));
    setFeaturedDirty(true);
  };

  const moveHomepageFeaturedVin = (vin: string, direction: "up" | "down") => {
    setFeaturedVinsDraft((prev) => {
      const index = prev.indexOf(vin);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setFeaturedDirty(true);
  };

  const openManualVehicleEditorForVin = (vin: string, options?: { addToFeatured?: boolean }) => {
    const normalizedVin = vin.trim().toUpperCase();
    if (normalizedVin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }

    const existing = manualVehicles.find((item) => (item.vin ?? "").trim().toUpperCase() === normalizedVin);
    if (existing) {
      populateManualVehicleForm(existing);
      if (options?.addToFeatured) {
        const featuredResult = addVinToFeaturedDraft(normalizedVin);
        if (featuredResult === "full") {
          toast({
            variant: "error",
            title: "Featured list full",
            description: `Manual record loaded. You can select up to ${homepageFeaturedLimit} featured vehicles.`
          });
        }
      }
      setFeaturedVinInput("");
      scrollToManualVehicleControl();
      toast({
        variant: "success",
        title: "Manual vehicle ready",
        description: `VIN ${normalizedVin} is loaded in Manual Vehicle Control for photo and pricing edits.`
      });
      return;
    }

    saveInventoryVinToManualMutation.mutate(
      { vin: normalizedVin },
      {
        onSuccess: (result) => {
          manualVehiclesQuery.refetch();
          homepageFeaturedQuery.refetch();
          populateManualVehicleForm(result.item);

          if (options?.addToFeatured) {
            const featuredResult = addVinToFeaturedDraft(normalizedVin);
            if (featuredResult === "full") {
              toast({
                variant: "error",
                title: "Featured list full",
                description: `Manual record saved. You can select up to ${homepageFeaturedLimit} featured vehicles.`
              });
            }
          }

          setFeaturedVinInput("");
          scrollToManualVehicleControl();
          toast({
            variant: "success",
            title: "Saved to Manual Vehicle Control",
            description: `VIN ${normalizedVin} is now editable (photos, pricing, details) for your homepage specials.`
          });
        }
      }
    );
  };

  const saveFeaturedVinToManualAndFeatured = () => {
    const vin = featuredVinInput.trim().toUpperCase();
    if (!vin) return;
    confirmAction(
      `Save VIN ${vin} to Manual Vehicle Control and add it to homepage featured?`,
      () => openManualVehicleEditorForVin(vin, { addToFeatured: true }),
      "This creates/updates a manual record so you can edit photos and pricing, and adds the VIN to the featured draft list."
    );
  };

  const saveHomepageFeatured = () => {
    const cleaned = featuredVinsDraft
      .map((vin) => vin.trim().toUpperCase())
      .filter((vin, idx, arr) => vin.length >= 8 && arr.indexOf(vin) === idx)
      .slice(0, homepageFeaturedLimit);
    saveHomepageFeaturedMutation.mutate(cleaned);
  };

  const resetManualVehicleForm = () => {
    setManualVin("");
    setManualYear("");
    setManualMake("");
    setManualModel("");
    setManualTrim("");
    setManualVehicleType("new");
    setManualListedPrice("");
    setManualMsrp("");
    setManualMileage("");
    setManualCondition("");
    setManualDealerName("");
    setManualDealerPhone("");
    setManualListingUrl("");
    setManualPhotoUrls([""]);
    setManualDownPayment("");
    setManualMonthlyPayment("");
    setManualDiscountedPrice("");
  };

  const populateManualVehicleForm = (item: ManualVehicleRecord) => {
    setManualVin((item.vin ?? "").toUpperCase());
    setManualYear(item.year != null ? String(item.year) : "");
    setManualMake(item.make ?? "");
    setManualModel(item.model ?? "");
    setManualTrim(item.trim ?? "");
    setManualVehicleType((item.vehicle_type ?? "new").toLowerCase() === "used" ? "used" : "new");
    setManualListedPrice(item.listed_price != null ? String(item.listed_price) : "");
    setManualMsrp(item.msrp != null ? String(item.msrp) : "");
    setManualMileage(item.mileage != null ? String(item.mileage) : "");
    setManualCondition(item.condition ?? "");
    setManualDealerName(item.dealer_name ?? "");
    setManualDealerPhone(item.dealer_phone ?? "");
    setManualListingUrl(item.listing_url ?? "");
    const nextPhotos = normalizePhotos(Array.isArray(item.photos) ? item.photos : []);
    setManualPhotoUrls(nextPhotos.length > 0 ? nextPhotos : [""]);
    setManualDownPayment(item.down_payment != null ? String(item.down_payment) : "");
    setManualMonthlyPayment(item.monthly_payment != null ? String(item.monthly_payment) : "");
    setManualDiscountedPrice(item.discounted_price != null ? String(item.discounted_price) : "");
  };

  const saveManualVehicle = () => {
    const vin = manualVin.trim().toUpperCase();
    if (vin.length < 8) {
      toast({ variant: "error", title: "Invalid VIN", description: "VIN must be at least 8 characters." });
      return;
    }
    const cleanPhotoUrls = normalizePhotos(manualPhotoUrls);
    upsertManualVehicleMutation.mutate({
      vin,
      vehicle_type: manualVehicleType,
      year: manualYear.trim() ? Number(manualYear) : null,
      make: manualMake.trim() || null,
      model: manualModel.trim() || null,
      trim: manualTrim.trim() || null,
      listed_price: manualListedPrice.trim() ? Number(manualListedPrice) : null,
      msrp: manualMsrp.trim() ? Number(manualMsrp) : null,
      mileage: manualMileage.trim() ? Number(manualMileage) : null,
      condition: manualCondition.trim() || null,
      dealer_name: manualDealerName.trim() || null,
      dealer_phone: manualDealerPhone.trim() || null,
      listing_url: manualListingUrl.trim() || null,
      photos: cleanPhotoUrls,
      down_payment: manualDownPayment.trim() ? Number(manualDownPayment) : null,
      monthly_payment: manualMonthlyPayment.trim() ? Number(manualMonthlyPayment) : null,
      discounted_price: manualDiscountedPrice.trim() ? Number(manualDiscountedPrice) : null
    });
  };

  const addManualPhotoInput = () => {
    setManualPhotoUrls((prev) => [...prev, ""]);
  };

  const onManualPhotoFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    uploadManualVehiclePhotoMutation.mutate(file);
  };

  const updateManualPhotoInput = (index: number, value: string) => {
    setManualPhotoUrls((prev) => prev.map((photoUrl, idx) => (idx === index ? value : photoUrl)));
  };

  const removeManualPhotoInput = (index: number) => {
    setManualPhotoUrls((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const makeManualPhotoPrimary = (index: number) => {
    if (index <= 0) return;
    setManualPhotoUrls((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  };

  const clearSeoForm = () => {
    setSeoTitle("");
    setSeoDescription("");
    setSeoKeywords("");
    setSeoCanonicalUrl("");
    setSeoOgTitle("");
    setSeoOgDescription("");
    setSeoOgImageUrl("");
    setSeoRobots("index,follow");
    setSeoJsonLd("{}");
    setSeoJsonLdPresetId("_");
    setSeoIsActive(true);
  };

  const saveSeoSetting = () => {
    if (!isValidSeoPageKey) {
      toast({
        variant: "error",
        title: "Invalid page key",
        description: "Use lowercase letters/numbers and optional _ or -."
      });
      return;
    }

    let parsedJsonLd: unknown = null;
    const rawJsonLd = seoJsonLd.trim();
    if (rawJsonLd) {
      try {
        parsedJsonLd = JSON.parse(rawJsonLd);
      } catch {
        toast({
          variant: "error",
          title: "Invalid JSON-LD",
          description: "Please enter valid JSON for structured data."
        });
        return;
      }
    }

    const clean = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    upsertSeoSettingMutation.mutate({
      pageKey: normalizedSeoPageKey,
      body: {
        title: clean(seoTitle),
        description: clean(seoDescription),
        keywords: clean(seoKeywords),
        canonical_url: clean(seoCanonicalUrl),
        og_title: clean(seoOgTitle),
        og_description: clean(seoOgDescription),
        og_image_url: clean(seoOgImageUrl),
        robots: clean(seoRobots),
        json_ld: parsedJsonLd,
        is_active: seoIsActive
      }
    });
  };

  const viewDoc = async (submissionId: number, kind: "drivers_license" | "insurance") => {
    try {
      const { blob, filename } = await api.brokerDocDownload(submissionId, kind);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast({ variant: "error", title: "Preview failed", description: errorMessage(err, "Could not open document preview.") });
    }
  };

  const seoSettingsCardProps: SeoSettingsCardProps = {
    seoPageKey,
    setSeoPageKey,
    normalizedSeoPageKey,
    isValidSeoPageKey,
    seoSettingQueryIsFetching: seoSettingQuery.isFetching,
    seoSettingErrorStatus: seoSettingErrorStatus ?? null,
    seoTitle,
    setSeoTitle,
    seoKeywords,
    setSeoKeywords,
    seoCanonicalUrl,
    setSeoCanonicalUrl,
    seoRobots,
    setSeoRobots,
    seoOgTitle,
    setSeoOgTitle,
    seoOgDescription,
    setSeoOgDescription,
    seoOgImageUrl,
    setSeoOgImageUrl,
    seoDescription,
    setSeoDescription,
    seoJsonLdPresetId,
    setSeoJsonLdPresetId,
    seoJsonLd,
    setSeoJsonLd,
    seoIsActive,
    setSeoIsActive,
    seoSettings: seoSettings.map((row) => ({ page_key: row.page_key })),
    upsertSeoSettingMutationIsPending: upsertSeoSettingMutation.isPending,
    deleteSeoSettingMutationIsPending: deleteSeoSettingMutation.isPending,
    onLoad: () => {
      void seoSettingQuery.refetch();
    },
    onSave: () =>
      confirmAction(
        `Save SEO setting for ${normalizedSeoPageKey}?`,
        saveSeoSetting,
        "This updates SEO metadata for this page key."
      ),
    onClearForm: clearSeoForm,
    onDelete: () =>
      confirmAction(
        `Delete SEO setting for ${normalizedSeoPageKey}?`,
        () => deleteSeoSettingMutation.mutate(normalizedSeoPageKey),
        "This removes the SEO override for this page key."
      )
  };

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="tc-fade-up relative w-full overflow-visible rounded-3xl border border-ink-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="market-kicker">Admin Console</p>
              <h1 className="market-heading text-3xl sm:text-4xl">
                {isSuperAdmin ? "Super Admin Workspace" : "Broker Workspace"}
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                {isSuperAdmin
                  ? "Manage inventory, offers, SEO, and lead delivery across all dealers."
                  : "Oversee deals, documents, and credit workflows for your brokers."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin ? (
                <AdminSuperAdminToolbar
                  activeDealerCount={activeDealerCount}
                  activeTotalCount={activeTotalCount}
                  activeNewCount={activeNewCount}
                  activeUsedCount={activeUsedCount}
                />
              ) : (
                <>
                  <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
                    {totalDeals.toLocaleString()} deals in queue
                  </Badge>
                  <Button
                    onClick={() =>
                      confirmAction(
                        "Sync sheets now?",
                        () => syncMutation.mutate(),
                        "This refreshes inventory-related data from your connected sheet workflow."
                      )
                    }
                    disabled={syncMutation.isPending}
                  >
                    Sync sheets
                  </Button>
                  <details className="w-full text-sm text-ink-600 md:w-auto">
                    <summary className="cursor-pointer font-medium text-brand-800 hover:underline">Broker testing tips</summary>
                    <ul className="mt-2 max-w-md list-disc space-y-1 pl-5 text-xs leading-relaxed">
                      <li>Use a <strong>broker_admin</strong> test login (not customer) to see queues, deals, and messages.</li>
                      <li>Open <strong>Broker Operations</strong> for the pipeline; use <strong>Leads</strong> for webhook delivery rows.</li>
                      <li>Pick a conversation thread, draft a reply, then send — customer sees it in Deal Room.</li>
                      <li><strong>Sync sheets</strong> refreshes inventory-related data from your connected sheet workflow.</li>
                    </ul>
                  </details>
                </>
              )}
            </div>
          </div>
        </section>

          <Tabs value={adminTab} onValueChange={(value) => setAdminTab(value as "broker_ops" | "credit_docs" | "leads" | "admin_data" | "landing_page" | "credit_unions" | "users")} className="space-y-4">
          <TabsList className="bg-ink-100 p-1">
            {!isSuperAdmin && <TabsTrigger value="broker_ops">Broker Operations</TabsTrigger>}
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="credit_docs">
              {isSuperAdmin ? "Forms & Results" : "Credit & Docs"}
              {(pendingCreditCount > 0 || pendingDocCount > 0) && (
                <span className="ml-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] text-white">
                  {pendingCreditCount + pendingDocCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="admin_data">{isSuperAdmin ? "Super Admin" : "Admin Data"}</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="landing_page">Landing Page</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="credit_unions">Credit Unions</TabsTrigger>}
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            <Card className="border-ink-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-brand-600" />
                  All Submitted Leads
                </CardTitle>
                <p className="text-sm text-ink-600">Get Price and other lead form submissions. Search and filter below.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <AdminLeadDeliveryPanel
                  leadDeliverySearch={leadDeliverySearch}
                  setLeadDeliverySearch={setLeadDeliverySearch}
                  leadDeliveryStatusFilter={leadDeliveryStatusFilter}
                  setLeadDeliveryStatusFilter={setLeadDeliveryStatusFilter}
                  leadDeliveryQueryRefetch={() => leadDeliveryQuery.refetch()}
                  leadDeliveryQueryIsFetching={leadDeliveryQuery.isFetching}
                  leadDeliveryItems={leadDeliveryItems}
                  retryLeadDeliveryMutationIsPending={retryLeadDeliveryMutation.isPending}
                  onRetryLeadDelivery={(leadId) =>
                    confirmAction(
                      `Retry webhook delivery for lead #${leadId}?`,
                      () => retryLeadDeliveryMutation.mutate(leadId),
                      "This re-sends the lead payload to Make/Zapier."
                    )
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {!isSuperAdmin && (
            <TabsContent value="broker_ops" className="space-y-6">
              <AdminBrokerOpsPanel
                dealPipelineRef={dealPipelineRef}
                conversationRef={conversationRef}
                messageScrollRef={messageScrollRef}
                deals={deals}
                threads={threads}
                vehiclesByVin={vehiclesByVin}
                latestDocByDealKey={latestDocByDealKey}
                latestDocByVin={latestDocByVin}
                latestCreditByDealKey={latestCreditByDealKey}
                latestCreditByVin={latestCreditByVin}
                offerOverrideByVin={offerOverrideByVin}
                dealSearch={dealSearch}
                setDealSearch={setDealSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                assignBrokerEmails={assignBrokerEmails}
                setAssignBrokerEmails={setAssignBrokerEmails}
                scheduleDates={scheduleDates}
                setScheduleDates={setScheduleDates}
                scheduleAddress={scheduleAddress}
                setScheduleAddress={setScheduleAddress}
                expandedDealId={expandedDealId}
                setExpandedDealId={setExpandedDealId}
                highlightedDealId={highlightedDealId}
                conversationSearch={conversationSearch}
                setConversationSearch={setConversationSearch}
                selectedThreadKey={selectedThreadKey}
                setSelectedThreadKey={setSelectedThreadKey}
                brokerReplyByThread={brokerReplyByThread}
                setBrokerReplyByThread={setBrokerReplyByThread}
                confirmAction={confirmAction}
                focusConversationForDeal={focusConversationForDeal}
                focusDealInPipeline={focusDealInPipeline}
                openDocsQueueForVin={openDocsQueueForVin}
                openCreditQueueForVin={openCreditQueueForVin}
                requestDocsForDeal={requestDocsForDeal}
                requestCreditForDeal={requestCreditForDeal}
                setDocStatusForDeal={setDocStatusForDeal}
                setCreditStatusForDeal={setCreditStatusForDeal}
                toggleLeaseSpecialForDeal={toggleLeaseSpecialForDeal}
                saveDealMetaMutation={saveDealMetaMutation}
                updateDealMutation={updateDealMutation}
                messagesQuery={messagesQuery}
                sendBrokerReplyMutation={sendBrokerReplyMutation}
                updateDocSubmissionMutation={updateDocSubmissionMutation}
                updateCreditApplicationMutation={updateCreditApplicationMutation}
                upsertOfferOverrideMutation={upsertOfferOverrideMutation}
                deleteOfferOverrideMutation={deleteOfferOverrideMutation}
                dealEventsQuery={dealEventsQuery}
              />
            </TabsContent>
          )}

          <TabsContent value="credit_docs" className="space-y-6">
            <AdminCreditAndDocsPanel
              layout="full"
              docsQueueRef={docsQueueRef}
              confirmAction={confirmAction}
              creditApplications={creditApplications}
              pendingCreditCount={pendingCreditCount}
              creditSearch={creditSearch}
              setCreditSearch={setCreditSearch}
              creditStatusFilter={creditStatusFilter}
              setCreditStatusFilter={setCreditStatusFilter}
              creditNotes={creditNotes}
              setCreditNotes={setCreditNotes}
              isSuperAdmin={isSuperAdmin}
              updateCreditApplicationPending={updateCreditApplicationMutation.isPending}
              onUpdateCreditApplication={(payload) => updateCreditApplicationMutation.mutate(payload)}
              docSubmissions={docSubmissions}
              pendingDocCount={pendingDocCount}
              docSearch={docSearch}
              setDocSearch={setDocSearch}
              docStatusFilter={docStatusFilter}
              setDocStatusFilter={setDocStatusFilter}
              docNotes={docNotes}
              setDocNotes={setDocNotes}
              updateDocSubmissionPending={updateDocSubmissionMutation.isPending}
              onUpdateDocSubmission={(payload) => updateDocSubmissionMutation.mutate(payload)}
              viewDoc={viewDoc}
            />
          </TabsContent>

          <TabsContent value="admin_data" className="space-y-6">
            {isSuperAdmin ? (
              <AdminSuperAdminDataPanel
                generalStatusQuery={generalStatusQuery}
                generalStatus={generalStatus}
                featuredMonth={featuredMonth}
                setFeaturedMonth={setFeaturedMonth}
                setFeaturedDirty={setFeaturedDirty}
                featuredVinInput={featuredVinInput}
                setFeaturedVinInput={setFeaturedVinInput}
                featuredVinsDraft={featuredVinsDraft}
                featuredDirty={featuredDirty}
                homepageFeaturedLimit={homepageFeaturedLimit}
                homepageFeaturedQuery={homepageFeaturedQuery}
                saveHomepageFeaturedMutation={saveHomepageFeaturedMutation}
                addHomepageFeaturedVin={addHomepageFeaturedVin}
                moveHomepageFeaturedVin={moveHomepageFeaturedVin}
                removeHomepageFeaturedVin={removeHomepageFeaturedVin}
                saveHomepageFeatured={saveHomepageFeatured}
                saveFeaturedVinToManualAndFeatured={saveFeaturedVinToManualAndFeatured}
                openManualVehicleEditorForVin={(vin) => openManualVehicleEditorForVin(vin)}
                saveInventoryVinToManualMutation={saveInventoryVinToManualMutation}
                vehiclesByVin={vehiclesByVin}
                featuredSummaryByVin={featuredSummaryByVin}
                manualVehicleControlRef={manualVehicleControlRef}
                manualVin={manualVin}
                setManualVin={setManualVin}
                manualYear={manualYear}
                setManualYear={setManualYear}
                manualMake={manualMake}
                setManualMake={setManualMake}
                manualModel={manualModel}
                setManualModel={setManualModel}
                manualTrim={manualTrim}
                setManualTrim={setManualTrim}
                manualVehicleType={manualVehicleType}
                setManualVehicleType={setManualVehicleType}
                manualListedPrice={manualListedPrice}
                setManualListedPrice={setManualListedPrice}
                manualMsrp={manualMsrp}
                setManualMsrp={setManualMsrp}
                manualMileage={manualMileage}
                setManualMileage={setManualMileage}
                manualCondition={manualCondition}
                setManualCondition={setManualCondition}
                manualDealerName={manualDealerName}
                setManualDealerName={setManualDealerName}
                manualDealerPhone={manualDealerPhone}
                setManualDealerPhone={setManualDealerPhone}
                manualListingUrl={manualListingUrl}
                setManualListingUrl={setManualListingUrl}
                manualPhotoUrls={manualPhotoUrls}
                setManualPhotoUrls={setManualPhotoUrls}
                manualDownPayment={manualDownPayment}
                setManualDownPayment={setManualDownPayment}
                manualMonthlyPayment={manualMonthlyPayment}
                setManualMonthlyPayment={setManualMonthlyPayment}
                manualDiscountedPrice={manualDiscountedPrice}
                setManualDiscountedPrice={setManualDiscountedPrice}
                manualSearch={manualSearch}
                setManualSearch={setManualSearch}
                addManualPhotoInput={addManualPhotoInput}
                onManualPhotoFileSelected={onManualPhotoFileSelected}
                updateManualPhotoInput={updateManualPhotoInput}
                makeManualPhotoPrimary={makeManualPhotoPrimary}
                removeManualPhotoInput={removeManualPhotoInput}
                uploadManualVehiclePhotoMutation={uploadManualVehiclePhotoMutation}
                upsertManualVehicleMutation={upsertManualVehicleMutation}
                deleteManualVehicleMutation={deleteManualVehicleMutation}
                manualVehiclesQuery={manualVehiclesQuery}
                manualVehicles={manualVehicles}
                saveManualVehicle={saveManualVehicle}
                resetManualVehicleForm={resetManualVehicleForm}
                populateManualVehicleForm={populateManualVehicleForm}
                addVinToFeaturedDraft={addVinToFeaturedDraft}
                seoSettingsCardProps={seoSettingsCardProps}
                confirmAction={confirmAction}
                toast={toast}
              />
            ) : (
              <AdminBrokerAdminDataPanel
                offerYear={offerYear}
                setOfferYear={setOfferYear}
                offerMake={offerMake}
                setOfferMake={setOfferMake}
                offerModel={offerModel}
                setOfferModel={setOfferModel}
                offerDownPayment={offerDownPayment}
                setOfferDownPayment={setOfferDownPayment}
                offerMonthlyPayment={offerMonthlyPayment}
                setOfferMonthlyPayment={setOfferMonthlyPayment}
                offerDiscountedPrice={offerDiscountedPrice}
                setOfferDiscountedPrice={setOfferDiscountedPrice}
                offerTermMonths={offerTermMonths}
                setOfferTermMonths={setOfferTermMonths}
                offerMilesPerYear={offerMilesPerYear}
                setOfferMilesPerYear={setOfferMilesPerYear}
                offerVehicleType={offerVehicleType}
                setOfferVehicleType={setOfferVehicleType}
                offerVin={offerVin}
                setOfferVin={setOfferVin}
                offerSearch={offerSearch}
                setOfferSearch={setOfferSearch}
                offerSourceFilter={offerSourceFilter}
                setOfferSourceFilter={setOfferSourceFilter}
                offerOverrides={offerOverrides}
                upsertOfferOverrideByYmmMutation={upsertOfferOverrideByYmmMutation}
                deleteOfferOverrideMutation={deleteOfferOverrideMutation}
                leadDeliverySearch={leadDeliverySearch}
                setLeadDeliverySearch={setLeadDeliverySearch}
                leadDeliveryStatusFilter={leadDeliveryStatusFilter}
                setLeadDeliveryStatusFilter={setLeadDeliveryStatusFilter}
                leadDeliveryQuery={leadDeliveryQuery}
                leadDeliveryItems={leadDeliveryItems}
                retryLeadDeliveryMutation={retryLeadDeliveryMutation}
                statusQuery={statusQuery}
                sourcesQuery={sourcesQuery}
                lenderName={lenderName}
                setLenderName={setLenderName}
                creditTier={creditTier}
                setCreditTier={setCreditTier}
                vehicleType={vehicleType}
                setVehicleType={setVehicleType}
                apr={apr}
                setApr={setApr}
                maxTerm={maxTerm}
                setMaxTerm={setMaxTerm}
                createRateMutation={createRateMutation}
                lenderRatesQuery={lenderRatesQuery}
                confirmAction={confirmAction}
                toast={toast}
              />
            )}
          </TabsContent>

          {isSuperAdmin && (
          <TabsContent value="landing_page" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-ink-800">
              <p>
                <span className="font-medium">Live site:</span> saving here updates the public homepage immediately.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href="/admin/landing-page">
                  Fullscreen editor
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <LandingPageEditor embedded />
          </TabsContent>
          )}
          {isSuperAdmin && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
          )}
          {isSuperAdmin && (
          <TabsContent value="credit_unions" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-800">
              <p className="text-ink-700">Manage partner sites here, or use the fullscreen page for a wider layout.</p>
              <Button asChild size="sm" variant="outline">
                <a href="/admin/credit-unions">
                  Fullscreen editor
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <CreditUnionsManager embedded />
          </TabsContent>
          )}
        </Tabs>

        <Dialog
          open={confirmState.open}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmState({ open: false, title: "", description: "", onConfirm: null });
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>{confirmState.description}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {confirmState.title}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmState({ open: false, title: "", description: "", onConfirm: null })}
              >
                No
              </Button>
              <Button
                onClick={() => {
                  const action = confirmState.onConfirm;
                  setConfirmState({ open: false, title: "", description: "", onConfirm: null });
                  action?.();
                }}
              >
                Yes, continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
