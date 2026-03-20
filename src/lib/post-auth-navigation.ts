/** Shared redirect rules after login / register / OTP verify. */

export type AppRouterLike = { replace: (href: string) => void };

export function normalizeRole(role: string | undefined | null) {
  return (role ?? "").toLowerCase();
}

export function homeForRole(role: string | undefined | null) {
  const r = normalizeRole(role);
  if (r === "dealer") return "/dashboard/dealer";
  if (r === "credit_union") return "/dashboard/credit-union";
  if (r === "admin" || r === "broker_admin" || r === "super_admin") return "/admin";
  if (r === "customer" || r === "broker") return "/dashboard/customer";
  return "/lease-specials";
}

export function isPathAllowedForRole(role: string | undefined | null, path: string) {
  const r = normalizeRole(role);
  const base = path.split("?")[0];
  if (base === "/admin") {
    return r === "admin" || r === "broker_admin" || r === "super_admin";
  }
  if (base === "/dashboard/dealer") {
    return r === "dealer";
  }
  if (base === "/dashboard/credit-union") {
    return r === "credit_union";
  }
  return true;
}

/**
 * Where to send the user after they have a valid session (same rules as the login page).
 */
export function navigateAfterSignIn(
  router: AppRouterLike,
  opts: { role: string | undefined | null; returnUrl?: string; approvalCode?: string }
) {
  const { role, returnUrl = "", approvalCode = "" } = opts;
  const r = normalizeRole(role);
  if (r === "credit_union") {
    const base = "/dashboard/credit-union";
    const dest = approvalCode ? `${base}?claim=${encodeURIComponent(approvalCode)}` : base;
    router.replace(dest);
    return;
  }
  const preferred = returnUrl || homeForRole(role);
  const safeBase = isPathAllowedForRole(role, preferred) ? preferred : homeForRole(role);
  const sep = safeBase.includes("?") ? "&" : "?";
  const dest = approvalCode ? `${safeBase}${sep}claim=${encodeURIComponent(approvalCode)}` : safeBase;
  router.replace(dest);
}
