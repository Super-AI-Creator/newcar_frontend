/**
 * Client-side validation for lead / contact forms.
 * Returns `null` when valid, or a short user-facing message.
 */

/** Full name: required, 2+ letters total, reasonable length, common name characters only */
export function validateLeadName(value: string): string | null {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "Name is required.";
  if (t.length < 2) return "Enter at least 2 characters.";
  if (t.length > 120) return "Name must be 120 characters or less.";
  const letterCount = (t.match(/\p{L}/gu) ?? []).length;
  if (letterCount < 2) return "Use at least two letters (first and last name).";
  if (!/^[\p{L}\s'.-]+$/u.test(t)) {
    return "Use only letters, spaces, hyphens, and apostrophes.";
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadEmail(value: string): string | null {
  const t = value.trim();
  if (!t) return "Email is required.";
  if (t.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(t)) return "Enter a valid email (example: you@company.com).";
  const [local, domain] = t.split("@");
  if (!local || !domain || local.length > 64 || !domain.includes(".")) {
    return "Enter a valid email address.";
  }
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return "Enter a valid email address.";
  return null;
}

/** At least 10 digits (US/local); allows formatting characters */
export function validateLeadPhone(value: string): string | null {
  const raw = value.trim();
  if (!raw) return "Phone is required.";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "Enter a valid phone number (at least 10 digits).";
  if (digits.length > 15) return "Phone number is too long (max 15 digits).";
  return null;
}
