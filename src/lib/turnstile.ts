/** Public site key (safe in browser). Set in Vercel / .env.local */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function isTurnstileEnabled(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}
