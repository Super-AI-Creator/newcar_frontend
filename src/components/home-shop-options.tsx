"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleDollarSign, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

function sanitizeOptions(items: string[] | undefined) {
  return Array.from(new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => !!item)));
}

const PAYMENT_MIN = 200;
const PAYMENT_MAX = 2000;
const PAYMENT_STEP = 25;
const PAYMENT_SLIDER_RANGE_STOPS = 9; // first 90% of slider is concrete payment values
const PAYMENT_SLIDER_FULL = 10; // last stop is "Any"
const PAYMENT_ANY_QUERY_VALUE = 10000;

function paymentToSliderValue(payment: number) {
  const clamped = Math.min(PAYMENT_MAX, Math.max(PAYMENT_MIN, payment));
  return Math.round(((clamped - PAYMENT_MIN) / (PAYMENT_MAX - PAYMENT_MIN)) * PAYMENT_SLIDER_RANGE_STOPS);
}

function sliderValueToPayment(sliderValue: number): number | null {
  if (sliderValue >= PAYMENT_SLIDER_FULL) return null;
  const normalized = Math.min(PAYMENT_SLIDER_RANGE_STOPS, Math.max(0, sliderValue));
  const raw = PAYMENT_MIN + ((PAYMENT_MAX - PAYMENT_MIN) * normalized) / PAYMENT_SLIDER_RANGE_STOPS;
  const snapped = Math.round(raw / PAYMENT_STEP) * PAYMENT_STEP;
  return Math.min(PAYMENT_MAX, Math.max(PAYMENT_MIN, snapped));
}

export default function HomeShopOptions() {
  const router = useRouter();
  const [paymentSliderValue, setPaymentSliderValue] = useState(() => paymentToSliderValue(500));
  const [paymentMode, setPaymentMode] = useState<"lease" | "finance">("lease");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [zipCode, setZipCode] = useState("");
  const maxPayment = sliderValueToPayment(paymentSliderValue);

  const filtersQuery = useQuery<Awaited<ReturnType<typeof api.getFilters>>>({
    queryKey: ["home-shop-options-filters"] as const,
    queryFn: () => api.getFilters(),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const makes = sanitizeOptions(filtersQuery.data?.makes);
  const modelsByMake = filtersQuery.data?.models_by_make ?? {};
  const models = useMemo(() => (make ? sanitizeOptions(modelsByMake[make]) : []), [make, modelsByMake]);

  const goByPayment = () => {
    const query = new URLSearchParams();
    query.set("vehicle_type", "new");
    query.set("mode", "payment");
    query.set("max_payment", String(maxPayment ?? PAYMENT_ANY_QUERY_VALUE));
    if (paymentMode === "finance") query.set("estimate", "true");
    router.push(`/search?${query.toString()}`);
  };

  const goByMakeModel = () => {
    const query = new URLSearchParams();
    query.set("vehicle_type", "new");
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    if (zipCode.trim()) query.set("zip", zipCode.trim());
    router.push(`/search?${query.toString()}`);
  };

  return (
    <section className="border-b border-ink-200 bg-white py-8 sm:py-10">
      <div className="container-wide grid gap-4 md:grid-cols-2">
        <Card className="border-ink-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CircleDollarSign className="h-5 w-5 text-brand-700" />
              Shop by Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
              {maxPayment === null ? "Any" : `$${maxPayment.toLocaleString()}`}
              <span className="ml-1 text-base font-medium text-ink-500">/month</span>
            </p>
            <Slider
              value={[paymentSliderValue]}
              min={0}
              max={PAYMENT_SLIDER_FULL}
              step={1}
              onValueChange={(v) => setPaymentSliderValue(v[0])}
            />
            <div className="relative h-4 text-[11px] text-ink-500">
              <span className="absolute left-0">${PAYMENT_MIN}</span>
              <span className="absolute left-[90%] -translate-x-1/2">${PAYMENT_MAX}</span>
              <span className="absolute right-0">Any</span>
            </div>
            <div className="flex gap-2">
              <Button variant={paymentMode === "lease" ? "default" : "outline"} size="sm" onClick={() => setPaymentMode("lease")}>
                Lease
              </Button>
              <Button variant={paymentMode === "finance" ? "default" : "outline"} size="sm" onClick={() => setPaymentMode("finance")}>
                Finance
              </Button>
            </div>
            <Button onClick={goByPayment} className="h-10 w-full text-sm">
              <span className="max-[420px]:hidden">See your matches</span>
              <span className="hidden max-[420px]:inline">See your matches</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="h-5 w-5 text-brand-700" />I Know What I Want
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Make</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select Make" />
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
            <div className="space-y-2">
              <Label>Select Model</Label>
              <Select
                value={model || "__any_model__"}
                disabled={!make}
                onValueChange={(value) => setModel(value === "__any_model__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={make ? "Select Model" : "Select make first"} />
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
            <div className="space-y-2">
              <Label>Enter ZIP Code</Label>
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="90001" inputMode="numeric" />
            </div>
            <Button onClick={goByMakeModel} className="h-10 w-full text-sm">
              <span className="max-[420px]:hidden">See your matches</span>
              <span className="hidden max-[420px]:inline">See your matches</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
