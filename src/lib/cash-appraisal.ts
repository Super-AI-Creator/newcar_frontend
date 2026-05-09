/**
 * Embedded instant cash appraisal (iframe — customer-facing flows).
 *
 * Override with `NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL` (e.g. staging). **Empty or whitespace**
 * intentionally falls back to production so `/trade-in` and `/trade-in-value` never lose the iframe
 * due to `.env.local` mistakes.
 */
export const STATIC_INSTANT_CASH_APPRAISAL_EMBED_URL = "https://appraisal.newcarsuperstore.com/";

export const CASH_APPRAISAL_EMBED_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL;
  if (raw === undefined) return STATIC_INSTANT_CASH_APPRAISAL_EMBED_URL;
  const t = raw.trim();
  return t !== "" ? t : STATIC_INSTANT_CASH_APPRAISAL_EMBED_URL;
})();
