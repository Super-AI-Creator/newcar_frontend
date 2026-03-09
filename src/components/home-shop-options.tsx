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

export default function HomeShopOptions() {
  const router = useRouter();
  const [maxPayment, setMaxPayment] = useState(500);
  const [paymentMode, setPaymentMode] = useState<"lease" | "finance">("lease");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [zipCode, setZipCode] = useState("");

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
    query.set("max_payment", String(maxPayment));
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
              ${maxPayment}
              <span className="ml-1 text-base font-medium text-ink-500">/month</span>
            </p>
            <Slider value={[maxPayment]} min={199} max={10000} step={25} onValueChange={(v) => setMaxPayment(v[0])} />
            <div className="flex gap-2">
              <Button variant={paymentMode === "lease" ? "default" : "outline"} size="sm" onClick={() => setPaymentMode("lease")}>
                Lease
              </Button>
              <Button variant={paymentMode === "finance" ? "default" : "outline"} size="sm" onClick={() => setPaymentMode("finance")}>
                Finance
              </Button>
            </div>
            <Button onClick={goByPayment} className="h-10 w-full text-sm">
              <span className="max-[420px]:hidden">See Cars I Qualify For</span>
              <span className="hidden max-[420px]:inline">See Cars</span>
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
              <span className="max-[420px]:hidden">View Available Cars</span>
              <span className="hidden max-[420px]:inline">View Cars</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
