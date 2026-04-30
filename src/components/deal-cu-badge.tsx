"use client";

import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/api";

export type DealCuBadgeFields = Pick<Deal, "credit_union_id" | "credit_union_name" | "approval_amount">;

function formatApprovalAmt(n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Visible label for credit-union–linked deals (broker queue, member deal room, etc.). */
export function DealCuBadge({ deal, className }: { deal: DealCuBadgeFields | null | undefined; className?: string }) {
  if (!deal?.credit_union_id && !deal?.credit_union_name?.trim()) return null;
  const label = deal.credit_union_name?.trim() || "Credit union";
  const amt = formatApprovalAmt(deal.approval_amount);
  return (
    <Badge
      className={`max-w-full whitespace-normal rounded-md border-[#1a4d8c]/35 bg-[#1a4d8c]/08 px-2 py-0.5 text-left text-[11px] font-semibold leading-snug text-[#1a4d8c] shadow-none ${className ?? ""}`}
      title={amt ? `${label} — pre-approved up to ${amt}` : `${label} member deal`}
    >
      <span className="opacity-90">CU</span>
      <span className="mx-1 font-normal opacity-40">·</span>
      <span className="font-medium">{label}</span>
      {amt ? <span className="ml-1 font-normal opacity-90">· Up to {amt}</span> : null}
    </Badge>
  );
}
