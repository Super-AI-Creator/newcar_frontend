import { env } from "@/lib/env";

type LeadFields = {
  vin?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: string | number;
  source?: string;
};

export function buildLeadFormUrl(fields: LeadFields = {}) {
  const url = new URL(env.leadFormUrl);
  if (fields.vin) url.searchParams.set("vin", String(fields.vin));
  if (fields.make) url.searchParams.set("make", String(fields.make));
  if (fields.model) url.searchParams.set("model", String(fields.model));
  if (fields.trim) url.searchParams.set("trim", String(fields.trim));
  if (fields.year !== undefined && fields.year !== null && String(fields.year).trim() !== "") {
    url.searchParams.set("year", String(fields.year));
  }
  if (fields.source) url.searchParams.set("source", fields.source);
  return url.toString();
}
