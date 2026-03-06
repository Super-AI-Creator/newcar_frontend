"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const priceOptions = [25000, 35000, 45000, 60000, 80000];

function sanitizeOptions(items: string[] | undefined) {
  return Array.from(new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => !!item)));
}

export default function HomeHeroSearch() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<"new" | "used">("new");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [maxPrice, setMaxPrice] = useState(45000);

  const filtersQuery = useQuery({
    queryKey: ["home-hero-filters"],
    queryFn: api.getFilters,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const makes = sanitizeOptions(filtersQuery.data?.makes);
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const models = useMemo(() => {
    if (!make) return [];
    return sanitizeOptions(modelsByMake[make]);
  }, [make, modelsByMake]);

  const runSearch = () => {
    const query = new URLSearchParams();
    query.set("vehicle_type", vehicleType);
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    query.set("max_price", String(maxPrice));
    router.push(`/search?${query.toString()}`);
  };

  return (
    <div className="mt-6 max-w-4xl rounded-2xl border border-ink-200 bg-white p-3 shadow-card sm:mt-8 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-ink-200 px-3 py-2">
          <p className="text-xs text-ink-500">Buy</p>
          <Select value={vehicleType} onValueChange={(value) => setVehicleType(value as "new" | "used")}>
            <SelectTrigger className="h-7 border-0 px-0 py-0 text-[13px] font-medium text-ink-900 shadow-none focus:ring-0 sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="used">Used cars</SelectItem>
              <SelectItem value="new">New cars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-ink-200 px-3 py-2">
          <p className="text-xs text-ink-500">Make</p>
          <Select
            value={make || "__any_make__"}
            onValueChange={(value) => {
              if (value === "__any_make__") {
                setMake("");
                setModel("");
                return;
              }
              setMake(value);
              setModel("");
            }}
          >
            <SelectTrigger className="h-7 border-0 px-0 py-0 text-[13px] font-medium text-ink-900 shadow-none focus:ring-0 sm:text-sm">
              <SelectValue placeholder="Any make" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any_make__">Any make</SelectItem>
              {makes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-ink-200 px-3 py-2">
          <p className="text-xs text-ink-500">Model</p>
          <Select
            value={model || "__any_model__"}
            disabled={!make}
            onValueChange={(value) => {
              if (value === "__any_model__") {
                setModel("");
                return;
              }
              setModel(value);
            }}
          >
            <SelectTrigger className="h-7 border-0 px-0 py-0 text-[13px] font-medium text-ink-900 shadow-none focus:ring-0 disabled:text-ink-400 sm:text-sm">
              <SelectValue placeholder={make ? "Any model" : "Select make first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any_model__">Any model</SelectItem>
              {models.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-ink-200 px-3 py-2">
          <p className="text-xs text-ink-500">Price max</p>
          <Select value={String(maxPrice)} onValueChange={(value) => setMaxPrice(Number(value))}>
            <SelectTrigger className="h-7 border-0 px-0 py-0 text-[13px] font-medium text-ink-900 shadow-none focus:ring-0 sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priceOptions.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  ${value.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={runSearch} className="h-full min-h-10 rounded-xl text-sm font-semibold">
          <span className="max-[420px]:hidden">Find Cars</span>
          <span className="hidden max-[420px]:inline">Find</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 flex justify-end sm:mt-3">
        <Button asChild variant="outline" className="h-9 rounded-xl px-3 text-[13px] sm:h-10 sm:px-4 sm:text-sm">
          <Link href="/search?vehicle_type=new&mode=payment&max_payment=650">
            <span className="max-[420px]:hidden">Shop by payment</span>
            <span className="hidden max-[420px]:inline">By payment</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
