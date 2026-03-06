"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { BadgeDollarSign, CarFront, CircleDollarSign, LandPlot, Percent, ShieldCheck } from "lucide-react";

export default function PrequalPage() {
  const [creditScore, setCreditScore] = useState("700");
  const [grossIncome, setGrossIncome] = useState("8000");
  const [downPayment, setDownPayment] = useState("2000");
  const [vehicleType, setVehicleType] = useState<"new" | "used">("new");

  const prequalMutation = useMutation({
    mutationFn: () =>
      api.prequal({
        credit_score: Number(creditScore),
        gross_monthly_income: Number(grossIncome),
        down_payment: Number(downPayment),
        vehicle_type: vehicleType
      })
  });

  const lenderOptionsMutation = useMutation({
    mutationFn: () =>
      api.lenderOptions({
        credit_score: Number(creditScore),
        vehicle_type: vehicleType,
        down_payment: Number(downPayment),
        term_months: 72
      })
  });

  const runCheck = async () => {
    await prequalMutation.mutateAsync();
    await lenderOptionsMutation.mutateAsync();
  };

  const targetPayment = prequalMutation.data?.target_payment;
  const estimatedBudget = prequalMutation.data?.estimated_budget;

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Credit-First Shopping</p>
          <h1 className="market-heading flex items-center gap-2 text-3xl sm:text-4xl">
            <ShieldCheck className="h-7 w-7 text-brand-700" />
            Prequal & Compare Lenders
          </h1>
        </section>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-brand-700" />
              Prequalification
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Credit score</Label>
              <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gross monthly income ($)</Label>
              <Input type="number" value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Down payment ($)</Label>
              <Input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
            </div>
              <div className="space-y-2">
                <Label>Vehicle type</Label>
                <div className="flex gap-2">
                  <Button variant={vehicleType === "new" ? "default" : "outline"} onClick={() => setVehicleType("new")}>
                    <CarFront className="mr-1 h-4 w-4" />
                    New
                  </Button>
                  <Button variant={vehicleType === "used" ? "default" : "outline"} onClick={() => setVehicleType("used")}>
                    <CarFront className="mr-1 h-4 w-4" />
                    Used
                  </Button>
                </div>
              </div>
            <div className="md:col-span-2">
              <Button onClick={runCheck} disabled={prequalMutation.isPending || lenderOptionsMutation.isPending}>
                {prequalMutation.isPending || lenderOptionsMutation.isPending ? "Checking..." : "Run prequal"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {prequalMutation.data && (
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-brand-700" />
                Estimated Buying Power
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-700">
              <p className="flex items-center gap-1">Tier: <strong>{prequalMutation.data.tier}</strong></p>
              <p className="flex items-center gap-1"><Percent className="h-4 w-4 text-ink-500" />APR baseline: <strong>{prequalMutation.data.apr}%</strong></p>
              <p className="flex items-center gap-1"><LandPlot className="h-4 w-4 text-ink-500" />Max term: <strong>{prequalMutation.data.max_term_months} months</strong></p>
              <p className="flex items-center gap-1"><CircleDollarSign className="h-4 w-4 text-ink-500" />Target payment: <strong>${targetPayment?.toLocaleString()}</strong></p>
              <p className="flex items-center gap-1"><CircleDollarSign className="h-4 w-4 text-ink-500" />Estimated budget: <strong>${estimatedBudget?.toLocaleString()}</strong></p>
              <div className="flex flex-wrap gap-2 pt-2">
                {targetPayment !== undefined && (
                  <Button asChild variant="outline">
                    <Link href={`/search?mode=payment&vehicle_type=${vehicleType}&max_payment=${Math.round(targetPayment)}`}>Shop by payment</Link>
                  </Button>
                )}
                {estimatedBudget !== undefined && (
                  <Button asChild>
                    <Link href={`/search?vehicle_type=${vehicleType}&max_price=${Math.round(estimatedBudget)}`}>Shop by budget</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {lenderOptionsMutation.data && (
          <Card className="border-ink-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeDollarSign className="h-5 w-5 text-brand-700" />
                Lender Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-700">
              {(lenderOptionsMutation.data.items ?? []).length === 0 && <p>No lender options configured yet.</p>}
              {(lenderOptionsMutation.data.items ?? []).map((item) => (
                <div key={`${item.lender_name}-${item.apr}-${item.max_term_months}`} className="rounded-xl border border-ink-200 p-3">
                  <p className="font-medium">{item.lender_name}</p>
                  <p>APR {item.apr}% • Max term {item.max_term_months} mo</p>
                  {item.estimated_monthly !== undefined && item.estimated_monthly !== null && (
                    <p>Estimated monthly ${item.estimated_monthly.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
