import { env } from "@/lib/env";
import { authStore } from "@/lib/auth-store";

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) return false;
  }
  return undefined;
}

function normalizeImageUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url.trim()) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const base = env.apiBaseUrl || "";
  if (!base) return url;
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

function normalizeVehicle(raw: any): Vehicle {
  const photosRaw = Array.isArray(raw?.photos)
    ? raw.photos
    : Array.isArray(raw?.photo_urls)
      ? raw.photo_urls
      : Array.isArray(raw?.images)
        ? raw.images
        : [];
  const photos = photosRaw.map((item: unknown) => normalizeImageUrl(item)).filter(Boolean) as string[];
  const photo =
    normalizeImageUrl(raw?.photo) ??
    normalizeImageUrl(raw?.image) ??
    normalizeImageUrl(raw?.photo_url) ??
    photos[0];

  const details =
    raw?.details && typeof raw.details === "string"
      ? (() => {
          try {
            return JSON.parse(raw.details);
          } catch {
            return undefined;
          }
        })()
      : raw?.details;

  return {
    vin: raw?.vin ?? "",
    year: toNumber(raw?.year),
    make: raw?.make ?? undefined,
    model: raw?.model ?? undefined,
    trim: raw?.trim ?? undefined,
    photo,
    photos,
    vehicle_type: raw?.vehicle_type ?? raw?.type ?? null,
    listed_price: toNumber(raw?.listed_price ?? raw?.price) ?? null,
    mileage: toNumber(raw?.mileage) ?? null,
    condition: raw?.condition ?? null,
    msrp: toNumber(raw?.msrp),
    down: toNumber(raw?.down ?? raw?.offer?.down ?? raw?.offer?.down_payment),
    monthly: toNumber(raw?.monthly ?? raw?.offer?.monthly ?? raw?.offer?.monthly_payment),
    discounted: toNumber(raw?.discounted ?? raw?.offer?.discounted ?? raw?.offer?.discounted_price),
    term_months: toNumber(raw?.term_months ?? raw?.termMonths ?? raw?.offer?.term_months ?? raw?.offer?.termMonths),
    miles_per_year: toNumber(raw?.miles_per_year ?? raw?.milesPerYear ?? raw?.offer?.miles_per_year ?? raw?.offer?.milesPerYear),
    details: details && typeof details === "object" ? details : undefined,
    city: raw?.city ?? raw?.dealer_city ?? raw?.location?.city ?? undefined,
    state: raw?.state ?? raw?.dealer_state ?? raw?.location?.state ?? undefined,
    distance_miles: toNumber(raw?.distance_miles ?? raw?.distance ?? raw?.miles_away ?? raw?.distanceMiles) ?? null,
    dealer_phone: raw?.dealer_phone ?? raw?.phone ?? raw?.dealer?.phone ?? null,
    dealer_name: raw?.dealer_name ?? raw?.dealer ?? raw?.dealer?.name ?? null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? raw?.last_seen_at ?? undefined,
    vehicle_history_url:
      raw?.vehicle_history_url ??
      raw?.vehicleHistoryUrl ??
      raw?.carfax_url ??
      details?.carfax_url ??
      null,
    history_url: raw?.history_url ?? raw?.historyUrl ?? raw?.carfax_url ?? details?.carfax_url ?? null,
    listing_url: raw?.listing_url ?? raw?.listingUrl ?? undefined,
    dealer: raw?.dealer ?? undefined
  };
}

function scoreTotal(raw: any): number {
  const modelScores = raw?.model_scores ?? raw?.modelScores;
  if (!modelScores || typeof modelScores !== "object") return 0;
  return (
    (toNumber(modelScores.design) ?? 0) +
    (toNumber(modelScores.performance) ?? 0) +
    (toNumber(modelScores.technology) ?? 0) +
    (toNumber(modelScores.practicality) ?? 0) +
    (toNumber(modelScores.future_value ?? modelScores.futureValue) ?? 0)
  );
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;
  const token = authStore.getToken();
  const headers = new Headers(options.headers ?? {});

  if (options.body !== undefined && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const data = await parseJson(response);
    const message =
      typeof data === "string"
        ? data
        : typeof data?.detail === "string"
          ? data.detail
          : data?.message ?? "Request failed";
    const error: ApiError = { status: response.status, message, details: data };
    throw error;
  }

  return (await parseJson(response)) as T;
}

export const api = {
  authWithGoogle: async (idToken: string) => {
    const data = await apiFetch<{
      token?: string;
      jwt?: string;
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      verification_required?: boolean;
      requiresVerification?: boolean;
      status?: string;
      user?: { id: string; name?: string; email?: string; role?: string };
    }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken })
    });
    return {
      ...data,
      token: data.token ?? data.jwt ?? data.access_token,
      jwt: data.jwt ?? data.token ?? data.access_token
    };
  },
  register: async (payload: { email: string; name: string; password: string; phone?: string; cu_signup_token?: string }) => {
    return apiFetch<{ registered?: boolean; message?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        password: payload.password,
        phone: payload.phone,
        channel: "email",
        cu_signup_token: payload.cu_signup_token
      })
    });
  },
  updateProfile: async (payload: { name: string; phone?: string }) => {
    return apiFetch<User>("/auth/me/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  changePassword: async (payload: { current_password: string; new_password: string }) => {
    return apiFetch<{ changed: boolean }>("/auth/me/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  requestOtp: async (payload: { email: string; name: string; password: string; phone?: string; channel?: "email" | "sms"; cu_signup_token?: string }) => {
    try {
      return await apiFetch<{ sent: boolean; delivery?: string; dev_code?: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      return apiFetch<{ sent: boolean; delivery?: string; dev_code?: string }>("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  },
  verifyOtp: async (email: string, code: string, channel: "email" | "sms" = "email", cu_signup_token?: string) => {
    const body = { email, code, channel } as Record<string, unknown>;
    if (cu_signup_token) body.cu_signup_token = cu_signup_token;
    try {
      return await apiFetch<{ registered: boolean; message?: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify(body)
      });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      return apiFetch<{ registered: boolean; message?: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(body)
      });
    }
  },
  login: async (email: string, password: string) => {
    try {
      const data = await apiFetch<{ access_token?: string; refresh_token?: string; token_type?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      return {
        ...data,
        token: data.access_token
      };
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      const data = await apiFetch<{ access_token?: string; refresh_token?: string; token_type?: string }>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      return {
        ...data,
        token: data.access_token
      };
    }
  },
  me: async () => {
    try {
      return await apiFetch<{ id: string; name?: string; email?: string; role?: string }>("/me");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      return apiFetch<{ id: string; name?: string; email?: string; role?: string }>("/auth/me");
    }
  },
  search: async (params: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    const normalizedSort =
      params.sort === "msrp_low_high"
        ? "price_asc"
        : params.sort === "price_high_low"
          ? "price_desc"
          : params.sort;
    const requestedPage = Math.max(1, Number(params.page ?? 1) || 1);
    const requestedPageSize = Math.max(1, Number(params.page_size ?? 20) || 20);
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === "") return;
      const finalValue = key === "sort" ? normalizedSort : value;
      query.set(key, String(finalValue));
    });

    if (normalizedSort === "score_high_low") {
      // Backend inventory endpoint does not natively sort by score, so rank client-side.
      query.set("page", "1");
      query.set("page_size", "500");

      let raw: any;
      try {
        raw = await apiFetch<any>(`/inventory/search?${query.toString()}`);
      } catch (inventoryError) {
        try {
          raw = await apiFetch<any>(`/search?${query.toString()}`);
        } catch (searchError) {
          const apiError = searchError as ApiError;
          if (apiError?.status) throw searchError;
          throw inventoryError;
        }
      }

      const rawResults = Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw)
            ? raw
            : [];
      rawResults.sort((a: any, b: any) => scoreTotal(b) - scoreTotal(a));
      const start = (requestedPage - 1) * requestedPageSize;
      const paged = rawResults.slice(start, start + requestedPageSize);
      const results = paged.map((item: any) => normalizeVehicle(item));
      return { results, total: rawResults.length } as { results: Vehicle[]; total: number };
    }

    let raw: any;
    try {
      raw = await apiFetch<any>(`/inventory/search?${query.toString()}`);
    } catch (inventoryError) {
      try {
        raw = await apiFetch<any>(`/search?${query.toString()}`);
      } catch (searchError) {
        const apiError = searchError as ApiError;
        if (apiError?.status) throw searchError;
        throw inventoryError;
      }
    }
    const rawResults = Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
          ? raw
          : [];
    const results = rawResults.map((item: any) => normalizeVehicle(item));
    const total = typeof raw?.total === "number" ? raw.total : results.length;
    return { results, total } as { results: Vehicle[]; total: number };
  },
  homepageSpecials: async (params?: { limit?: number; month?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.month) query.set("month", params.month);
    const qs = query.toString();

    try {
      const raw = await apiFetch<any>(`/inventory/homepage-specials${qs ? `?${qs}` : ""}`);
      const rawResults = Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw)
            ? raw
            : [];
      const results = rawResults.map((item: any) => normalizeVehicle(item));
      const total = typeof raw?.total === "number" ? raw.total : results.length;
      return { results, total } as { results: Vehicle[]; total: number };
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      return api.search({ vehicle_type: "new", offers_only: true, page: 1, page_size: params?.limit ?? 6, sort: "best_deal" });
    }
  },
  getFilters: async (params?: { vehicle_type?: "new" | "used" | "all"; offers_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.vehicle_type) query.set("vehicle_type", params.vehicle_type);
    if (params?.offers_only !== undefined) query.set("offers_only", String(params.offers_only));
    const qs = query.toString();

    try {
      return await apiFetch<{
        makes?: string[];
        models?: string[];
        trims?: string[];
        models_by_make?: Record<string, string[]>;
        trims_by_make_model?: Record<string, string[]>;
      }>(`/inventory/filters${qs ? `?${qs}` : ""}`);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
    }

    try {
      const searchQuery = new URLSearchParams();
      if (params?.vehicle_type) searchQuery.set("vehicle_type", params.vehicle_type);
      if (params?.offers_only !== undefined) searchQuery.set("offers_only", String(params.offers_only));
      searchQuery.set("page", "1");
      searchQuery.set("page_size", "500");
      const searchData = await apiFetch<any>(`/inventory/search?${searchQuery.toString()}`);
      const items = Array.isArray(searchData?.items)
        ? searchData.items
        : Array.isArray(searchData?.results)
          ? searchData.results
          : [];

      const makesSet = new Set<string>();
      const modelsByMake: Record<string, Set<string>> = {};
      const trimsByMakeModel: Record<string, Set<string>> = {};
      for (const item of items) {
        const make = typeof item?.make === "string" ? item.make.trim() : "";
        const model = typeof item?.model === "string" ? item.model.trim() : "";
        const trim = typeof item?.trim === "string" ? item.trim.trim() : "";
        if (!make || !model) continue;
        makesSet.add(make);
        if (!modelsByMake[make]) modelsByMake[make] = new Set<string>();
        modelsByMake[make].add(model);
        if (trim) {
          const key = `${make}|||${model}`;
          if (!trimsByMakeModel[key]) trimsByMakeModel[key] = new Set<string>();
          trimsByMakeModel[key].add(trim);
        }
      }

      const makes = Array.from(makesSet).sort();
      const modelsByMakeSorted: Record<string, string[]> = {};
      Object.keys(modelsByMake).forEach((make) => {
        modelsByMakeSorted[make] = Array.from(modelsByMake[make]).sort();
      });
      const trimsByMakeModelSorted: Record<string, string[]> = {};
      Object.keys(trimsByMakeModel).forEach((key) => {
        trimsByMakeModelSorted[key] = Array.from(trimsByMakeModel[key]).sort();
      });
      const models = Array.from(new Set(Object.values(modelsByMakeSorted).flat())).sort();
      const trims = Array.from(new Set(Object.values(trimsByMakeModelSorted).flat())).sort();

      return {
        makes,
        models,
        trims,
        models_by_make: modelsByMakeSorted,
        trims_by_make_model: trimsByMakeModelSorted
      };
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status && apiError.status !== 404) throw error;
    }

    try {
      return await apiFetch<{
        makes?: string[];
        models?: string[];
        trims?: string[];
        models_by_make?: Record<string, string[]>;
        trims_by_make_model?: Record<string, string[]>;
      }>("/vehicles/filters");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      const data = await apiFetch<any>("/inventory/search?page=1&page_size=200");
      const items = Array.isArray(data?.items) ? data.items : [];
      const makes = [...new Set(items.map((i: any) => i?.make).filter((v: unknown) => typeof v === "string"))] as string[];
      const models = [...new Set(items.map((i: any) => i?.model).filter((v: unknown) => typeof v === "string"))] as string[];
      const trims = [...new Set(items.map((i: any) => i?.trim).filter((v: unknown) => typeof v === "string"))] as string[];
      return { makes, models, trims };
    }
  },
  getVehicle: async (vin: string) => {
    try {
      const data = await apiFetch<any>(`/vehicles/${vin}`);
      return normalizeVehicle(data);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      const data = await apiFetch<any>(`/inventory/${vin}`);
      return normalizeVehicle(data);
    }
  },
  estimatePayment: async (payload: Record<string, unknown>) => {
    const query = new URLSearchParams();
    if (payload.vin) query.set("vin", String(payload.vin));
    if (payload.apr !== undefined) query.set("apr", String(payload.apr));
    if (payload.term !== undefined) query.set("term", String(payload.term));
    if (payload.down !== undefined) query.set("down", String(payload.down));
    const data = await apiFetch<{
      estimated_monthly?: number;
      down?: number;
      vehicle_price?: number;
      total?: number;
    }>(`/payments/estimate?${query.toString()}`);
    return {
      monthly: toNumber(data.estimated_monthly),
      down: toNumber(data.down),
      total: toNumber(data.total ?? data.vehicle_price)
    };
  },
  favorites: async () => {
    const rows = await apiFetch<Array<{ vin: string }>>("/favorites");
    const vehicles = await Promise.all(
      (rows ?? []).map(async (item) => {
        try {
          return await api.getVehicle(item.vin);
        } catch {
          return normalizeVehicle({ vin: item.vin });
        }
      })
    );
    return { items: vehicles };
  },
  toggleFavorite: async (vin: string) => {
    const data = await apiFetch<{ status?: string }>(`/favorites/${vin}`, { method: "POST" });
    return { saved: data.status === "added" || data.status === "exists" };
  },
  getRecommendations: async (params: {
    fun?: number;
    styling?: number;
    performance?: number;
    practical?: number;
    value?: number;
    vehicle_type?: "new" | "used" | "all";
    make?: string;
    model?: string;
    sort_by?: "best" | "price" | "payment";
    max_price?: number;
    max_payment?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      query.set(key, String(value));
    });
    const data = await apiFetch<{
      items: Array<{
        vin: string;
        make?: string;
        model?: string;
        trim?: string;
        vehicle_type?: string;
        photo?: string;
        photos?: string[];
        score: number;
        explanation?: Record<string, number>;
      }>;
    }>(`/recommendations/best?${query.toString()}`);
    return {
      items: (data.items ?? []).map((item) => {
        const photos = (Array.isArray(item.photos) ? item.photos : [])
          .map((url) => normalizeImageUrl(url))
          .filter(Boolean) as string[];
        const photo = normalizeImageUrl(item.photo) ?? photos[0];
        return { ...item, photo, photos };
      })
    };
  },
  messages: () => apiFetch<{ items: Message[] }>("/messages"),
  sendMessage: async (payload: { vin?: string; message: string }) => {
    const data = await apiFetch<{ status?: string }>("/broker/message", {
      method: "POST",
      body: JSON.stringify({
        vin: payload.vin,
        message_text: payload.message
      })
    });
    return { sent: data.status === "sent" };
  },
  sendBrokerReply: async (payload: { customer_user_id: number; vin?: string; message: string }) => {
    const data = await apiFetch<{ status?: string }>("/broker/reply", {
      method: "POST",
      body: JSON.stringify({
        customer_user_id: payload.customer_user_id,
        vin: payload.vin,
        message_text: payload.message
      })
    });
    return { sent: data.status === "sent" };
  },
  submitLead: async (payload: {
    vin?: string;
    year?: number | string;
    make?: string;
    model?: string;
    trim?: string;
    vehicle?: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    source?: string;
  }) => {
    return apiFetch<{ saved: boolean; lead_id: number }>("/leads", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createDeal: async (payload: { vin: string; customer_note?: string }) => {
    return apiFetch<Deal>("/deals", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  myDeals: async () => {
    const data = await apiFetch<{ items?: Deal[] }>("/deals/mine");
    return { items: data.items ?? [] };
  },
  allDeals: async () => {
    const data = await apiFetch<{ items?: Deal[] }>("/deals");
    return { items: data.items ?? [] };
  },
  brokerQueue: async () => {
    const data = await apiFetch<{ items?: Deal[] }>("/deals/queue");
    return { items: data.items ?? [] };
  },
  updateDeal: async (
    dealId: number,
    payload: {
      status?: Deal["status"];
      broker_note?: string;
      assigned_broker_user_id?: number;
      assigned_broker_email?: string;
      delivery_scheduled_at?: string;
      delivery_address?: string;
      delivery_city?: string;
      delivery_state?: string;
      delivery_zip?: string;
      delivery_notes?: string;
    }
  ) => {
    return apiFetch<Deal>(`/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  dealEvents: async (dealId: number) => {
    const data = await apiFetch<{ items?: DealEvent[] }>(`/deals/${dealId}/events`);
    return { items: data.items ?? [] };
  },
  prequal: async (payload: { credit_score: number; gross_monthly_income: number; vehicle_type?: "new" | "used"; down_payment?: number }) => {
    const query = new URLSearchParams();
    query.set("credit_score", String(payload.credit_score));
    query.set("gross_monthly_income", String(payload.gross_monthly_income));
    query.set("vehicle_type", payload.vehicle_type ?? "new");
    if (payload.down_payment !== undefined) query.set("down_payment", String(payload.down_payment));
    return apiFetch<{
      tier: string;
      apr: number;
      max_term_months: number;
      target_payment: number;
      estimated_budget: number;
    }>(`/credit/prequal?${query.toString()}`);
  },
  lenderOptions: async (payload: { credit_score: number; vehicle_type?: "new" | "used"; vin?: string; down_payment?: number; term_months?: number }) => {
    const query = new URLSearchParams();
    query.set("credit_score", String(payload.credit_score));
    query.set("vehicle_type", payload.vehicle_type ?? "new");
    if (payload.vin) query.set("vin", payload.vin);
    if (payload.down_payment !== undefined) query.set("down_payment", String(payload.down_payment));
    if (payload.term_months !== undefined) query.set("term_months", String(payload.term_months));
    return apiFetch<{
      tier: string;
      vehicle_type: string;
      vin?: string | null;
      vehicle_price?: number | null;
      items: Array<{
        lender_name: string;
        credit_tier: string;
        vehicle_type: string;
        apr: number;
        max_term_months: number;
        effective_term_months: number;
        estimated_monthly?: number | null;
      }>;
    }>(`/credit/lender-options?${query.toString()}`);
  },
  lenderRates: async () => {
    const data = await apiFetch<{ items?: LenderRate[] }>("/lenders/rates");
    return { items: data.items ?? [] };
  },
  createLenderRate: async (payload: Omit<LenderRate, "id" | "created_at" | "updated_at">) => {
    return apiFetch<LenderRate>("/lenders/rates", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateLenderRate: async (rateId: number, payload: Omit<LenderRate, "id" | "created_at" | "updated_at">) => {
    return apiFetch<LenderRate>(`/lenders/rates/${rateId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteLenderRate: async (rateId: number) => {
    return apiFetch<{ deleted: boolean }>(`/lenders/rates/${rateId}`, {
      method: "DELETE"
    });
  },
  creditApplication: async (payload: Record<string, unknown>) => {
    try {
      const data = await apiFetch<{ submitted?: boolean }>("/credit-applications", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return { submitted: !!data.submitted };
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      const data = await apiFetch<{ status?: string }>("/credit/apply", {
        method: "POST",
        body: JSON.stringify({
          vin: typeof payload.vin === "string" ? payload.vin : undefined,
          payload_json: payload
        })
      });
      return { submitted: data.status === "received" };
    }
  },
  publicCreditApplication: async (payload: {
    first_name: string;
    last_name: string;
    email: string;
    birth_date?: string;
    ssn?: string;
    drivers_license_number?: string;
    street_address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    time_at_current_address?: string;
    home_phone?: string;
    previous_street_address?: string;
    previous_city?: string;
    previous_state?: string;
    previous_zip_code?: string;
    time_at_previous_address?: string;
    employment_status?: string;
    occupation_title?: string;
    employer_name?: string;
    work_phone?: string;
    time_at_current_job?: string;
    work_street_address?: string;
    work_city?: string;
    work_state?: string;
    work_zip_code?: string;
    previous_employer?: string;
    time_at_previous_employer?: string;
    gross_monthly_income?: number;
    housing_status?: string;
    monthly_housing_payment?: number;
    salesperson_name?: string;
    electronic_signature?: string;
    agreed_to_terms: boolean;
    vin?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_trim?: string;
    notes?: string;
  }) => {
    const data = await apiFetch<{ status?: string }>("/credit/public-apply", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { submitted: data.status === "received" };
  },
  dealerInventory: async (params?: { page?: number; page_size?: number; include_total?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.page_size != null) query.set("page_size", String(params.page_size));
    if (params?.include_total != null) query.set("include_total", String(params.include_total));
    const qs = query.toString();
    try {
      const data = await apiFetch<{ items?: any[]; total?: number | null; has_more?: boolean; page?: number; page_size?: number }>(
        `/dealer/inventory${qs ? `?${qs}` : ""}`
      );
      return {
        items: (data.items ?? []).map((item) => normalizeVehicle(item)),
        total: data.total ?? null,
        has_more: !!data.has_more,
        page: data.page ?? 1,
        page_size: data.page_size ?? 50
      };
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status !== 404) throw error;
      const data = await apiFetch<any>("/inventory/search?vehicle_type=new&page=1&page_size=50");
      const items = Array.isArray(data?.items) ? data.items : [];
      return { items: items.map((item: any) => normalizeVehicle(item)), total: items.length, has_more: false, page: 1, page_size: 50 };
    }
  },
  updateOffer: (
    vin: string,
    payload: { down?: number | null; monthly?: number | null; discounted?: number | null; term_months?: number | null; miles_per_year?: number | null }
  ) =>
    apiFetch<{ updated: boolean }>(`/dealer/offers/${vin}`, {
      method: "PUT",
      body: JSON.stringify({
        down_payment: payload.down,
        monthly_payment: payload.monthly,
        discounted_price: payload.discounted,
        term_months: payload.term_months,
        miles_per_year: payload.miles_per_year
      })
    }),
  updateOfferByYmm: (
    payload: {
      year: number;
      make: string;
      model: string;
      vehicle_type?: "all" | "new" | "used";
      down?: number | null;
      monthly?: number | null;
      discounted?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }
  ) =>
    apiFetch<{ status: string; updated_count: number; year: number; make: string; model: string; vins: string[] }>(
      "/dealer/offers-by-ymm",
      {
        method: "PUT",
        body: JSON.stringify({
          year: payload.year,
          make: payload.make,
          model: payload.model,
          vehicle_type: payload.vehicle_type ?? "all",
          down_payment: payload.down,
          monthly_payment: payload.monthly,
          discounted_price: payload.discounted,
          term_months: payload.term_months,
          miles_per_year: payload.miles_per_year
        })
      }
    ),
  syncSheets: async () => {
    await apiFetch<unknown>("/admin/sync-sheets", { method: "POST" });
    return { ok: true };
  },
  adminSources: async () => {
    const data = await apiFetch<{ sources?: AdminSource[]; items?: any[] }>("/admin/sources");
    const sources = Array.isArray(data.sources)
      ? data.sources
      : (data.items ?? []).map((item: any) => ({
          id: String(item.id),
          name: item.name ?? item.dealer_name ?? item.source_name ?? `Source ${item.id}`,
          status:
            item.status ??
            item.source_status ??
            (() => {
              const activeValue = toBoolean(item.is_active ?? item.active);
              if (activeValue === true) return "active";
              if (activeValue === false) return "inactive";
              return "active";
            })(),
          lastSyncedAt:
            item.last_synced_at ??
            item.lastSyncedAt ??
            item.updated_at ??
            item.updatedAt ??
            item.last_imported_at ??
            item.lastImportedAt
        }));
    return { sources };
  },
  syncStatus: async () => {
    const data = await apiFetch<{
      items?: Array<{
        sheet_name?: string;
        sheet_id?: string;
        tab_name?: string;
        last_synced_at?: string;
        last_row_hash?: string;
        last_error?: string | null;
      }>;
      counts?: { offer_overrides?: number; model_scores?: number };
    }>("/admin/sync-status");
    return {
      items: data.items ?? [],
      counts: {
        offer_overrides: data.counts?.offer_overrides ?? 0,
        model_scores: data.counts?.model_scores ?? 0
      }
    };
  },
  adminGeneralStatus: async () => {
    return apiFetch<AdminGeneralStatus>("/admin/general-status");
  },
  adminUsers: async () => {
    return apiFetch<User[]>(`/admin/users`);
  },
  adminUpdateUser: async (
    userId: number,
    payload: {
      name?: string;
      phone?: string | null;
      role?: string;
      is_email_verified?: boolean;
      is_phone_verified?: boolean;
    }
  ) => {
    return apiFetch<User>(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  adminHomepageFeatured: async (params?: { month?: string }) => {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", params.month);
    const qs = query.toString();
    return apiFetch<HomepageFeaturedResponse>(`/admin/homepage-featured${qs ? `?${qs}` : ""}`);
  },
  setAdminHomepageFeatured: async (payload: { vins: string[]; month?: string }) => {
    const query = new URLSearchParams();
    if (payload.month) query.set("month", payload.month);
    const qs = query.toString();
    return apiFetch<HomepageFeaturedResponse>(`/admin/homepage-featured${qs ? `?${qs}` : ""}`, {
      method: "PUT",
      body: JSON.stringify({ vins: payload.vins })
    });
  },
  adminManualVehicles: async (params?: { q?: string; limit?: number; include_inactive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.include_inactive != null) query.set("include_inactive", String(params.include_inactive));
    const qs = query.toString();
    const data = await apiFetch<{ items?: ManualVehicleRecord[] }>(`/admin/manual-vehicles${qs ? `?${qs}` : ""}`);
    return { items: data.items ?? [] };
  },
  uploadAdminManualVehiclePhoto: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const data = await apiFetch<{ url?: string; filename?: string; content_type?: string; size_bytes?: number }>(
      "/admin/manual-vehicles/upload-photo",
      {
        method: "POST",
        body: form
      }
    );
    return {
      ...data,
      url: normalizeImageUrl(data.url) ?? data.url ?? ""
    };
  },
  upsertAdminManualVehicle: async (
    vin: string,
    payload: {
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
    }
  ) => {
    return apiFetch<{ status: string; item: ManualVehicleRecord }>(`/admin/manual-vehicles/${encodeURIComponent(vin)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteAdminManualVehicle: async (vin: string) => {
    return apiFetch<{ deleted: boolean; vin: string }>(`/admin/manual-vehicles/${encodeURIComponent(vin)}`, {
      method: "DELETE"
    });
  },
  adminSeoSettings: async (params?: { q?: string; include_inactive?: boolean; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.include_inactive != null) query.set("include_inactive", String(params.include_inactive));
    if (params?.limit != null) query.set("limit", String(params.limit));
    const qs = query.toString();
    const data = await apiFetch<{ items?: SeoPageSettingRecord[] }>(`/admin/seo-settings${qs ? `?${qs}` : ""}`);
    return { items: data.items ?? [] };
  },
  adminSeoSetting: async (pageKey: string) => {
    return apiFetch<SeoPageSettingRecord>(`/admin/seo-settings/${encodeURIComponent(pageKey)}`);
  },
  upsertAdminSeoSetting: async (
    pageKey: string,
    payload: {
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
    }
  ) => {
    return apiFetch<{ status: string; item: SeoPageSettingRecord }>(`/admin/seo-settings/${encodeURIComponent(pageKey)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteAdminSeoSetting: async (pageKey: string) => {
    return apiFetch<{ deleted: boolean; page_key: string }>(`/admin/seo-settings/${encodeURIComponent(pageKey)}`, {
      method: "DELETE"
    });
  },
  adminLeadDelivery: async (params?: { status?: "pending" | "sent" | "failed" | "skipped"; q?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.q) query.set("q", params.q);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const data = await apiFetch<{ items?: LeadDeliveryRecord[] }>(`/admin/lead-delivery${qs ? `?${qs}` : ""}`);
    return { items: data.items ?? [] };
  },
  adminRetryLeadDelivery: async (leadId: number) => {
    return apiFetch<{ queued: boolean; lead_id: number; webhook_status: string }>(`/admin/lead-delivery/${leadId}/retry`, {
      method: "POST"
    });
  },
  adminOfferOverrides: async (params?: { source?: "sheet" | "dealer" | "broker"; q?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.source) query.set("source", params.source);
    if (params?.q) query.set("q", params.q);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const data = await apiFetch<{ items?: OfferOverrideRecord[] }>(`/admin/offer-overrides${qs ? `?${qs}` : ""}`);
    return { items: data.items ?? [] };
  },
  upsertAdminOfferOverride: async (
    vin: string,
    payload: {
      down_payment?: number | null;
      monthly_payment?: number | null;
      discounted_price?: number | null;
      term_months?: number | null;
      miles_per_year?: number | null;
    }
  ) => {
    return apiFetch<OfferOverrideRecord>(`/admin/offer-overrides/${encodeURIComponent(vin)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  upsertAdminOfferOverrideByYmm: async (payload: {
    year: number;
    make: string;
    model: string;
    vehicle_type?: "all" | "new" | "used";
    down_payment?: number | null;
    monthly_payment?: number | null;
    discounted_price?: number | null;
    term_months?: number | null;
    miles_per_year?: number | null;
  }) => {
    return apiFetch<{ status: string; updated_count: number; year: number; make: string; model: string; vins: string[] }>(
      "/admin/offer-overrides-by-ymm",
      {
        method: "PUT",
        body: JSON.stringify(payload)
      }
    );
  },
  deleteAdminOfferOverride: async (vin: string) => {
    return apiFetch<{ deleted: boolean; vin: string }>(`/admin/offer-overrides/${encodeURIComponent(vin)}`, {
      method: "DELETE"
    });
  },
  getTestimonials: async () => {
    const data = await apiFetch<Array<{ id: string; title?: string; quote: string; author: string; image_url?: string | null }>>(
      "/testimonials"
    );
    return Array.isArray(data) ? data : [];
  },
  adminListTestimonials: async () => {
    return apiFetch<{ items: Array<{ id: number; author: string; title?: string | null; quote: string; image_url?: string | null; sort_order: number }> }>(
      "/admin/testimonials"
    );
  },
  adminCreateTestimonial: async (payload: { author: string; quote: string; title?: string | null; image_url?: string | null; sort_order?: number }) => {
    return apiFetch<{ status: string; item: { id: number; author: string; title?: string | null; quote: string; image_url?: string | null; sort_order: number } }>(
      "/admin/testimonials",
      { method: "POST", body: JSON.stringify(payload) }
    );
  },
  adminUpdateTestimonial: async (
    id: number,
    payload: { author?: string; quote?: string; title?: string | null; image_url?: string | null; sort_order?: number }
  ) => {
    return apiFetch<{ status: string; item: { id: number; author: string; title?: string | null; quote: string; image_url?: string | null; sort_order: number } }>(
      `/admin/testimonials/${encodeURIComponent(String(id))}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
  },
  adminDeleteTestimonial: async (id: number) => {
    return apiFetch<{ deleted: boolean; id: number }>(`/admin/testimonials/${encodeURIComponent(String(id))}`, { method: "DELETE" });
  },

  // Articles (public + admin)
  getArticles: async () => {
    const data = await apiFetch<{ items: ArticleRecord[] }>("/articles");
    return data.items ?? [];
  },
  getArticleBySlug: async (slug: string) => {
    return apiFetch<ArticleRecord & { content: string }>(`/articles/by-slug/${encodeURIComponent(slug)}`);
  },
  adminListArticles: async () => {
    const data = await apiFetch<{ items: ArticleRecord[] }>("/admin/articles");
    return data.items ?? [];
  },
  adminCreateArticle: async (payload: ArticleUpsertPayload) => {
    const data = await apiFetch<{ status: string; item: ArticleRecord & { content: string } }>("/admin/articles", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return data.item;
  },
  adminUpdateArticle: async (id: number, payload: ArticleUpsertPayload) => {
    const data = await apiFetch<{ status: string; item: ArticleRecord & { content: string } }>(
      `/admin/articles/${encodeURIComponent(String(id))}`,
      { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }
    );
    return data.item;
  },
  adminDeleteArticle: async (id: number) => {
    return apiFetch<{ deleted: boolean; id: number }>(`/admin/articles/${encodeURIComponent(String(id))}`, { method: "DELETE" });
  },

  forwardDocs: async (formData: FormData) => {
    const data = await apiFetch<{ status?: string; id?: number }>("/docs/forward", {
      method: "POST",
      body: formData
    });
    return { sent: data.status === "stored" || data.status === "sent", id: data.id };
  },
  brokerCreditApplications: async (params?: { status?: string; q?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.q) query.set("q", params.q);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    const data = await apiFetch<{ items?: CreditApplicationRecord[]; total?: number }>(
      `/credit/applications${qs ? `?${qs}` : ""}`
    );
    return { items: data.items ?? [], total: data.total ?? (data.items ?? []).length };
  },
  updateBrokerCreditApplication: async (applicationId: number, payload: { status?: string; broker_note?: string }) => {
    return apiFetch<CreditApplicationRecord>(`/credit/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  brokerDocSubmissions: async (params?: { status?: string; q?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.q) query.set("q", params.q);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    const data = await apiFetch<{ items?: DocumentSubmissionRecord[]; total?: number }>(
      `/docs/submissions${qs ? `?${qs}` : ""}`
    );
    return { items: data.items ?? [], total: data.total ?? (data.items ?? []).length };
  },
  updateBrokerDocSubmission: async (submissionId: number, payload: { status?: string; broker_note?: string }) => {
    return apiFetch<DocumentSubmissionRecord>(`/docs/submissions/${submissionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  myDocSubmissions: async (params?: { vin?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.vin) query.set("vin", params.vin);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    const data = await apiFetch<{ items?: DocumentSubmissionRecord[]; total?: number }>(
      `/docs/mine${qs ? `?${qs}` : ""}`
    );
    return { items: data.items ?? [], total: data.total ?? (data.items ?? []).length };
  },
  myCreditApplications: async (params?: { vin?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.vin) query.set("vin", params.vin);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    const data = await apiFetch<{ items?: CreditApplicationRecord[]; total?: number }>(
      `/credit/mine${qs ? `?${qs}` : ""}`
    );
    return { items: data.items ?? [], total: data.total ?? (data.items ?? []).length };
  },
  brokerDocDownload: async (submissionId: number, kind: "drivers_license" | "insurance") => {
    const token = authStore.getToken();
    const response = await fetch(`${env.apiBaseUrl}/docs/submissions/${submissionId}/file/${kind}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include"
    });
    if (!response.ok) {
      const data = await parseJson(response);
      const message =
        typeof data === "string" ? data : typeof data?.detail === "string" ? data.detail : data?.message ?? "Download failed";
      const error: ApiError = { status: response.status, message, details: data };
      throw error;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match?.[1] ?? `${kind}-${submissionId}`;
    return { blob, filename };
  },

  // Credit Unions (admin + public white-label)
  listCreditUnions: async (params?: { q?: string; include_inactive?: boolean; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.include_inactive) query.set("include_inactive", "true");
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const data = await apiFetch<{ items: CreditUnionRecord[] }>(`/admin/credit-unions${qs ? `?${qs}` : ""}`);
    return data.items ?? [];
  },
  getCreditUnion: async (id: number) => {
    return apiFetch<CreditUnionRecord>(`/admin/credit-unions/${id}`);
  },
  createCreditUnion: async (payload: CreditUnionCreatePayload) => {
    const data = await apiFetch<{ item: CreditUnionRecord }>("/admin/credit-unions", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return data.item;
  },
  updateCreditUnion: async (id: number, payload: CreditUnionUpdatePayload) => {
    const data = await apiFetch<{ item: CreditUnionRecord }>(`/admin/credit-unions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return data.item;
  },
  deleteCreditUnion: async (id: number) => {
    return apiFetch<{ deleted: boolean; id: number }>(`/admin/credit-unions/${id}`, { method: "DELETE" });
  },
  assignCreditUnionStaff: async (cuId: number, email: string) => {
    return apiFetch<{ ok: boolean; message: string }>(`/admin/credit-unions/${cuId}/assign-staff`, {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      headers: { "Content-Type": "application/json" },
    });
  },
  getCreditUnionBySlug: async (slug: string) => {
    return apiFetch<CreditUnionRecord>(`/credit-unions/by-slug/${encodeURIComponent(slug)}`);
  },
  getCreditUnionByToken: async (token: string) => {
    return apiFetch<CreditUnionRecord>(`/credit-unions/by-token?token=${encodeURIComponent(token)}`);
  },

  // Pre-approvals
  createApproval: async (cuId: number, payload: ApprovalCreatePayload) => {
    const data = await apiFetch<{ item: ApprovalRecord; approval_code: string; claim_url: string; join_url: string; sms_sent: boolean }>(
      `/admin/credit-unions/${cuId}/approvals`,
      { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }
    );
    return data;
  },
  listMyApprovals: async () => {
    const data = await apiFetch<{ items: ApprovalRecord[] }>("/approvals/mine");
    return data.items ?? [];
  },
  getApprovalByCode: async (code: string) => {
    return apiFetch<ApprovalRecord & { credit_union_name?: string; credit_union_slug?: string }>(`/approvals/by-code/${encodeURIComponent(code)}`);
  },
  claimApproval: async (code: string) => {
    return apiFetch<{ item: ApprovalRecord; claimed?: boolean; already_claimed?: boolean }>(`/approvals/claim/${encodeURIComponent(code)}`, {
      method: "PATCH",
    });
  },

  // Landing page content (public GET; admin GET/PUT)
  getLandingPage: async () => {
    return apiFetch<LandingPageContentRecord>("/landing-page");
  },
  getAdminLandingPage: async () => {
    return apiFetch<LandingPageContentRecord>("/admin/landing-page");
  },
  updateLandingPage: async (payload: LandingPageUpdatePayload) => {
    const data = await apiFetch<{ status: string; content: LandingPageContentRecord }>("/admin/landing-page", {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return data.content;
  },
};

export type Vehicle = {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  photo?: string;
  photos?: string[];
  vehicle_type?: "new" | "used" | "all" | null;
  listed_price?: number | null;
  mileage?: number | null;
  condition?: "used" | "cpo" | "all" | string | null;
  vehicle_history_url?: string | null;
  history_url?: string | null;
  msrp?: number;
  down?: number;
  monthly?: number;
  discounted?: number;
  term_months?: number;
  miles_per_year?: number;
  details?: Record<string, unknown>;
  city?: string;
  state?: string;
  distance_miles?: number | null;
  dealer_phone?: string | null;
  dealer_name?: string | null;
  updatedAt?: string;
  listing_url?: string | null;
  dealer?: string;
};

export type Message = {
  id: string;
  vin?: string;
  body: string;
  createdAt?: string;
  from?: string;
  senderType?: "customer" | "broker" | string;
  userId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  brokerAdminUserId?: string | null;
  brokerAdminEmail?: string | null;
};

export type Deal = {
  id: number;
  user_id: number;
  vin: string;
  status: "inquiry" | "broker_review" | "offer_ready" | "locked" | "docs_pending" | "delivered" | "cancelled" | string;
  customer_note?: string | null;
  broker_note?: string | null;
  assigned_broker_user_id?: number | null;
  assigned_broker_email?: string | null;
  assigned_broker_name?: string | null;
  delivery_scheduled_at?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_zip?: string | null;
  delivery_notes?: string | null;
  locked_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
};

export type DealEvent = {
  id: number;
  deal_id: number;
  actor_user_id?: number | null;
  event_type: string;
  message?: string | null;
  created_at?: string | null;
};

export type AdminSource = {
  id: string;
  name: string;
  status: string;
  lastSyncedAt?: string;
};

export type LenderRate = {
  id: number;
  lender_name: string;
  credit_tier: string;
  vehicle_type: string;
  apr: number;
  max_term_months: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreditApplicationRecord = {
  id: number;
  user_id?: number | null;
  vin?: string | null;
  source?: string | null;
  status?: string | null;
  broker_note?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_name?: string | null;
  reviewed_by_email?: string | null;
  reviewed_at?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
};

export type DocumentSubmissionRecord = {
  id: number;
  user_id: number;
  vin?: string | null;
  status?: string | null;
  broker_note?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_name?: string | null;
  reviewed_by_email?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  drivers_license_filename?: string | null;
  insurance_filename?: string | null;
};

export type OfferOverrideRecord = {
  vin: string;
  source?: "sheet" | "dealer" | "broker" | string | null;
  down_payment?: number | null;
  monthly_payment?: number | null;
  discounted_price?: number | null;
  term_months?: number | null;
  miles_per_year?: number | null;
  updated_at?: string | null;
};

export type HomepageFeaturedItem = {
  position: number;
  vin: string;
  updated_at?: string | null;
  vehicle?: {
    vin: string;
    found?: boolean;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
    monthly_payment?: number | null;
    down_payment?: number | null;
    discounted_price?: number | null;
  };
};

export type HomepageFeaturedResponse = {
  month: string;
  max_items: number;
  count: number;
  vins: string[];
  items: HomepageFeaturedItem[];
};

export type ManualVehicleRecord = {
  vin: string;
  vehicle_type?: "new" | "used" | string | null;
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
  is_active?: boolean;
  updated_at?: string | null;
  down_payment?: number | null;
  monthly_payment?: number | null;
  discounted_price?: number | null;
  term_months?: number | null;
  miles_per_year?: number | null;
};

export type LeadDeliveryRecord = {
  lead_id: number;
  created_at?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  vin?: string | null;
  vehicle?: string | null;
  source?: string | null;
  notes?: string | null;
  webhook_status?: "pending" | "sent" | "failed" | "skipped" | string | null;
  webhook_attempts?: number | null;
  webhook_last_error?: string | null;
  webhook_last_attempt_at?: string | null;
  webhook_delivered_at?: string | null;
};

export type AdminGeneralStatus = {
  generated_at?: string | null;
  dealers: {
    active_count: number;
    names: string[];
  };
  vehicles: {
    active_new_count: number;
    active_used_count: number;
    active_total_count: number;
  };
};

export type User = {
  id: number;
  email: string;
  phone?: string | null;
  name: string;
  role: string;
  credit_union_id?: number | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
};

export type SeoPageSettingRecord = {
  page_key: string;
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
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreditUnionLoanProgramRecord = {
  id?: number;
  interest_rate: number;
  max_term_months: number;
  vehicle_type: string;
};

export type CreditUnionDisclosureRecord = {
  id?: number;
  sort_order: number;
  text: string;
};

export type CreditUnionRecord = {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  banner_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  phone?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  signup_token?: string | null;
  signup_link?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  loan_programs?: CreditUnionLoanProgramRecord[];
  disclosures?: CreditUnionDisclosureRecord[];
};

export type CreditUnionCreatePayload = {
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  phone?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  loan_programs?: CreditUnionLoanProgramRecord[];
  disclosures?: CreditUnionDisclosureRecord[];
};

export type CreditUnionUpdatePayload = {
  name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  phone?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  is_active?: boolean | null;
  loan_programs?: CreditUnionLoanProgramRecord[] | null;
  disclosures?: CreditUnionDisclosureRecord[] | null;
};

export type ArticleRecord = {
  id: number;
  title: string;
  description?: string | null;
  slug: string;
  date: string;
  content?: string;
};

export type ArticleUpsertPayload = {
  title: string;
  description?: string | null;
  slug: string;
  date: string;
  content: string;
};

export type ApprovalRecord = {
  id: number;
  credit_union_id: number;
  user_id?: number | null;
  loan_amount: number;
  term_months: number;
  special_notes?: string | null;
  approval_code: string;
  member_phone?: string | null;
  member_email?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  credit_union_name?: string | null;
};

export type ApprovalCreatePayload = {
  loan_amount: number;
  term_months: number;
  special_notes?: string | null;
  approval_code?: string | null;
  member_phone?: string | null;
  member_email?: string | null;
};

export type LandingPageContentRecord = {
  hero?: { kicker?: string; headline?: string; subtext?: string; slide_urls?: string[]; slide_focus?: string[] };
  lease?: { title?: string; subtitle?: string };
  how_it_works?: Array<{ image_url?: string; label?: string; image_focus?: string }>;
  footer?: {
    facebook_url?: string;
    twitter_url?: string;
    google_plus_url?: string;
    instagram_url?: string;
    youtube_url?: string;
  };
};

export type LandingPageUpdatePayload = {
  hero?: { kicker?: string; headline?: string; subtext?: string; slide_urls?: string[]; slide_focus?: string[] };
  lease?: { title?: string; subtitle?: string };
  how_it_works?: Array<{ image_url?: string; label?: string; image_focus?: string }>;
  footer?: {
    facebook_url?: string;
    twitter_url?: string;
    google_plus_url?: string;
    instagram_url?: string;
    youtube_url?: string;
  };
};
