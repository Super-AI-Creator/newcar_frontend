/**
 * Embedded instant cash appraisal (replaces in-site trade wizard for hero / direct links).
 * Override with `NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL` (set to empty string to use the in-app trade form locally).
 */
export const CASH_APPRAISAL_EMBED_URL = (
  process.env.NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL !== undefined
    ? process.env.NEXT_PUBLIC_CASH_APPRAISAL_EMBED_URL
    : "https://appraisal.newcarsuperstore.com/"
).trim();
