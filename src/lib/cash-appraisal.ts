/**
 * Embedded instant cash appraisal URL used by trade-in entry points.
 * You can override via NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL (non-empty).
 */
export const CASH_APPRAISAL_EMBED_URL =
  (process.env.NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL ?? "https://appraisal.newcarsuperstore.com/").trim() ||
  "https://appraisal.newcarsuperstore.com/";
