"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  active: "lease" | "finance";
};

function copyParamIfPresent(target: URLSearchParams, source: URLSearchParams, key: string) {
  const v = source.get(key);
  if (v != null && v !== "") target.set(key, v);
}

export default function MarketplaceLeaseFinanceTabs({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const leaseUrl = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of ["max_payment", "max_price", "make", "model", "trim", "sort", "page"]) {
      copyParamIfPresent(q, searchParams, key);
    }
    copyParamIfPresent(q, searchParams, "cu");
    const s = q.toString();
    return s ? `/lease-specials?${s}` : "/lease-specials";
  }, [searchParams]);

  const financeUrl = useMemo(() => {
    const q = new URLSearchParams();
    copyParamIfPresent(q, searchParams, "cu");
    const vt = searchParams.get("vehicle_type") === "used" ? "used" : "new";
    q.set("vehicle_type", vt);

    if (vt === "used") {
      q.set("mode", "price");
      const mp = searchParams.get("max_price");
      if (mp) q.set("max_price", mp);
      else q.set("max_price", "999999");
      copyParamIfPresent(q, searchParams, "make");
      copyParamIfPresent(q, searchParams, "model");
      copyParamIfPresent(q, searchParams, "trim");
      copyParamIfPresent(q, searchParams, "sort");
      copyParamIfPresent(q, searchParams, "page");
      copyParamIfPresent(q, searchParams, "max_mileage");
    } else {
      q.set("mode", "payment");
      // Lease-specials "max payment" is lease $/mo; finance search uses loan estimates. Do not copy a lease
      // cap into /search or the API uses the payment-filter path and can return ~1 page of wrong matches.
      const maxPay =
        pathname === "/lease-specials" ? null : searchParams.get("max_payment");
      q.set("max_payment", maxPay && maxPay.length > 0 ? maxPay : "10000");
      copyParamIfPresent(q, searchParams, "make");
      copyParamIfPresent(q, searchParams, "model");
      copyParamIfPresent(q, searchParams, "trim");
      copyParamIfPresent(q, searchParams, "sort");
      copyParamIfPresent(q, searchParams, "page");
      copyParamIfPresent(q, searchParams, "down_payment");
      copyParamIfPresent(q, searchParams, "term_months");
      copyParamIfPresent(q, searchParams, "apr");
      if (searchParams.get("estimate") === "true") q.set("estimate", "true");
    }

    return `/search?${q.toString()}`;
  }, [searchParams, pathname]);

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        router.push(value === "lease" ? leaseUrl : financeUrl);
      }}
      className="w-full max-w-[min(100%,20rem)] shrink-0"
    >
      <TabsList className="grid h-9 w-full grid-cols-2 gap-0.5 bg-ink-100 p-0.5 shadow-sm">
        <TabsTrigger value="lease" className="px-2 text-xs sm:text-[13px]">
          Lease Payments
        </TabsTrigger>
        <TabsTrigger value="finance" className="px-2 text-xs sm:text-[13px]">
          Finance Payments
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
