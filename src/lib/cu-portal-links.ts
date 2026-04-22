import { env } from "@/lib/env";

function normalizePortalBase(raw: string): string {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

/**
 * Vehicle search URL for members leaving the marketing-site CU page (`/cu/[slug]`).
 * When `NEXT_PUBLIC_CU_PORTAL_BASE_URL` is set, returns an absolute URL on the CU web app
 * so search + vehicle detail stay on the same domain/branding as the credit union site.
 * Otherwise returns a relative `/search?...` URL for the main marketplace app.
 */
export function cuVehicleSearchHref(
  cuSlug: string,
  vehicleType: "new" | "used",
  options: { maxPrice?: number; searchMode?: "price" | "payment" } = {}
): string {
  const mode = options.searchMode ?? "price";
  const qs = new URLSearchParams();
  qs.set("vehicle_type", vehicleType);
  qs.set("cu", cuSlug);
  const portalBase = normalizePortalBase(env.cuPortalBaseUrl);
  if (portalBase) {
    qs.set("search_mode", mode);
  } else {
    qs.set("mode", mode);
  }
  if (options.maxPrice != null && Number.isFinite(options.maxPrice)) {
    qs.set("max_price", String(Math.round(options.maxPrice)));
  }
  const rel = `/search?${qs.toString()}`;
  if (!portalBase) return rel;
  return `${portalBase}${rel}`;
}
