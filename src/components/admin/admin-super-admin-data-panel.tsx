"use client";

import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Flag, Upload } from "lucide-react";

import type { ManualVehicleRecord, Vehicle } from "@/lib/api";
import { SeoSettingsCard, type SeoSettingsCardProps } from "@/components/admin/seo-settings-card";
import { formatCurrency, formatDateTime, vehicleTitle } from "@/components/admin/admin-broker-ops-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type AdminSuperAdminDataPanelProps = {
  generalStatusQuery: UseQueryResult<any>;
  generalStatus: {
    generated_at?: string | null;
    dealers: { active_count: number; names: string[] };
    vehicles: { active_new_count: number; active_used_count: number; active_total_count: number };
  } | null | undefined;

  setFeaturedDirty: (v: boolean) => void;
  featuredVinInput: string;
  setFeaturedVinInput: (v: string) => void;
  featuredVinsDraft: string[];
  featuredDirty: boolean;
  homepageFeaturedLimit: number;
  homepageFeaturedQuery: UseQueryResult<any>;
  saveHomepageFeaturedMutation: UseMutationResult<any, any, string[], any>;
  addHomepageFeaturedVin: () => void;
  moveHomepageFeaturedVin: (vin: string, direction: "up" | "down") => void;
  removeHomepageFeaturedVin: (vin: string) => void;
  saveHomepageFeatured: () => void;
  saveFeaturedVinToManualAndFeatured: () => void;
  openManualVehicleEditorForVin: (vin: string) => void;
  saveInventoryVinToManualMutation: UseMutationResult<any, any, { vin: string }, any>;

  vehiclesByVin: Record<string, Vehicle>;
  featuredSummaryByVin: Record<
    string,
    | {
        year?: number | null;
        make?: string | null;
        model?: string | null;
        trim?: string | null;
        monthly_payment?: number | null;
      }
    | undefined
  >;

  manualVehicleControlRef: RefObject<HTMLDivElement>;

  manualVin: string;
  setManualVin: (v: string) => void;
  manualYear: string;
  setManualYear: (v: string) => void;
  manualMake: string;
  setManualMake: (v: string) => void;
  manualModel: string;
  setManualModel: (v: string) => void;
  manualTrim: string;
  setManualTrim: (v: string) => void;
  manualVehicleType: "new" | "used";
  setManualVehicleType: (v: "new" | "used") => void;
  manualListedPrice: string;
  setManualListedPrice: (v: string) => void;
  manualMsrp: string;
  setManualMsrp: (v: string) => void;
  manualMileage: string;
  setManualMileage: (v: string) => void;
  manualCondition: string;
  setManualCondition: (v: string) => void;
  manualDealerName: string;
  setManualDealerName: (v: string) => void;
  manualDealerPhone: string;
  setManualDealerPhone: (v: string) => void;
  manualListingUrl: string;
  setManualListingUrl: (v: string) => void;
  manualPhotoUrls: string[];
  setManualPhotoUrls: Dispatch<SetStateAction<string[]>>;
  manualDownPayment: string;
  setManualDownPayment: (v: string) => void;
  manualMonthlyPayment: string;
  setManualMonthlyPayment: (v: string) => void;
  manualDiscountedPrice: string;
  setManualDiscountedPrice: (v: string) => void;
  manualSearch: string;
  setManualSearch: (v: string) => void;

  addManualPhotoInput: () => void;
  onManualPhotoFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  updateManualPhotoInput: (index: number, value: string) => void;
  makeManualPhotoPrimary: (index: number) => void;
  removeManualPhotoInput: (index: number) => void;

  uploadManualVehiclePhotoMutation: UseMutationResult<any, any, File, any>;
  upsertManualVehicleMutation: UseMutationResult<any, any, any, any>;
  deleteManualVehicleMutation: UseMutationResult<any, any, string, any>;
  manualVehiclesQuery: UseQueryResult<any>;
  manualVehicles: ManualVehicleRecord[];

  saveManualVehicle: () => void;
  resetManualVehicleForm: () => void;
  populateManualVehicleForm: (item: ManualVehicleRecord) => void;
  addVinToFeaturedDraft: (vin: string) => "added" | "already" | "full";

  seoSettingsCardProps: SeoSettingsCardProps;

  confirmAction: (title: string, onConfirm: () => void, description?: string) => void;
  toast: (opts: any) => void;
};

export function AdminSuperAdminDataPanel({
  generalStatusQuery,
  generalStatus,
  setFeaturedDirty,
  featuredVinInput,
  setFeaturedVinInput,
  featuredVinsDraft,
  featuredDirty,
  homepageFeaturedLimit,
  homepageFeaturedQuery,
  saveHomepageFeaturedMutation,
  addHomepageFeaturedVin,
  moveHomepageFeaturedVin,
  removeHomepageFeaturedVin,
  saveHomepageFeatured,
  saveFeaturedVinToManualAndFeatured,
  openManualVehicleEditorForVin,
  saveInventoryVinToManualMutation,
  vehiclesByVin,
  featuredSummaryByVin,
  manualVehicleControlRef,
  manualVin,
  setManualVin,
  manualYear,
  setManualYear,
  manualMake,
  setManualMake,
  manualModel,
  setManualModel,
  manualTrim,
  setManualTrim,
  manualVehicleType,
  setManualVehicleType,
  manualListedPrice,
  setManualListedPrice,
  manualMsrp,
  setManualMsrp,
  manualMileage,
  setManualMileage,
  manualCondition,
  setManualCondition,
  manualDealerName,
  setManualDealerName,
  manualDealerPhone,
  setManualDealerPhone,
  manualListingUrl,
  setManualListingUrl,
  manualPhotoUrls,
  manualDownPayment,
  setManualDownPayment,
  manualMonthlyPayment,
  setManualMonthlyPayment,
  manualDiscountedPrice,
  setManualDiscountedPrice,
  addManualPhotoInput,
  onManualPhotoFileSelected,
  updateManualPhotoInput,
  makeManualPhotoPrimary,
  removeManualPhotoInput,
  manualSearch,
  setManualSearch,
  uploadManualVehiclePhotoMutation,
  upsertManualVehicleMutation,
  deleteManualVehicleMutation,
  manualVehiclesQuery,
  manualVehicles,
  saveManualVehicle,
  resetManualVehicleForm,
  populateManualVehicleForm,
  addVinToFeaturedDraft,
  seoSettingsCardProps,
  confirmAction,
  toast
}: AdminSuperAdminDataPanelProps) {
  return (
    <>
      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-brand-600" />
            General Feed Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-600">
            Super Admin overview of active feed dealers and active inventory counts. More status functions can be added here later.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => generalStatusQuery.refetch()} disabled={generalStatusQuery.isFetching}>
              Refresh
            </Button>
            {generalStatus?.generated_at && <Badge>Updated {formatDateTime(generalStatus.generated_at)}</Badge>}
          </div>

          {generalStatusQuery.isLoading && <p className="text-sm text-ink-600">Loading general status...</p>}
          {generalStatusQuery.isError && <p className="text-sm text-red-700">Could not load general status. Please refresh.</p>}

          {!generalStatusQuery.isLoading && !generalStatusQuery.isError && generalStatus && (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Active dealers</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.dealers.active_count}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Active new cars</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_new_count}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Active used cars</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_used_count}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Active total cars</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{generalStatus.vehicles.active_total_count}</p>
                </div>
              </div>

              <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Active dealer names</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generalStatus.dealers.names.map((name) => (
                    <Badge key={name} className="border-ink-300 bg-white text-ink-700">
                      {name}
                    </Badge>
                  ))}
                  {generalStatus.dealers.names.length === 0 && <p className="text-sm text-ink-600">No active dealers found in feed.</p>}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-brand-600" />
            Homepage Featured Cars (6 slots)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-600">
            Pick and order the vehicles shown on the landing page permanently. Save up to {homepageFeaturedLimit} VINs, and use &quot;Save VIN + Edit
            Photos&quot; for static/manual specials you can fine-tune.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={homepageFeaturedQuery.isFetching}
              onClick={() => {
                setFeaturedDirty(false);
                homepageFeaturedQuery.refetch();
              }}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              disabled={saveHomepageFeaturedMutation.isPending || !featuredDirty}
              onClick={() =>
                confirmAction(
                  "Save featured homepage vehicles?",
                  saveHomepageFeatured,
                  "This updates the permanent landing page featured cars."
                )
              }
            >
              Save Featured Cars
            </Button>
            <Badge>
              {featuredVinsDraft.length}/{homepageFeaturedLimit}
            </Badge>
            {featuredDirty && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Unsaved</Badge>}
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <Input
              value={featuredVinInput}
              onChange={(e) => setFeaturedVinInput(e.target.value.toUpperCase())}
              placeholder="Add VIN"
            />
            <Button size="sm" onClick={addHomepageFeaturedVin} disabled={!featuredVinInput.trim()}>
              Add VIN
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!featuredVinInput.trim() || saveInventoryVinToManualMutation.isPending}
              onClick={saveFeaturedVinToManualAndFeatured}
            >
              Save VIN + Edit Photos
            </Button>
          </div>

          <div className="space-y-2">
            {featuredVinsDraft.map((vin, index) => {
              const vehicle = vehiclesByVin[vin];
              const summary = featuredSummaryByVin[vin];
              const title =
                vehicleTitle(vehicle, vin) !== `VIN ${vin}`
                  ? vehicleTitle(vehicle, vin)
                  : [summary?.year, summary?.make, summary?.model, summary?.trim].filter(Boolean).join(" ") || `VIN ${vin}`;
              const monthly = vehicle?.monthly ?? summary?.monthly_payment;
              return (
                <div key={vin} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      #{index + 1} {title}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saveInventoryVinToManualMutation.isPending}
                        onClick={() => openManualVehicleEditorForVin(vin)}
                      >
                        Edit Photos
                      </Button>
                      <Button size="sm" variant="outline" disabled={index === 0} onClick={() => moveHomepageFeaturedVin(vin, "up")}>
                        Up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={index === featuredVinsDraft.length - 1}
                        onClick={() => moveHomepageFeaturedVin(vin, "down")}
                      >
                        Down
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeHomepageFeaturedVin(vin)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-ink-600">
                    VIN {vin}
                    {typeof monthly === "number" ? ` | ${formatCurrency(monthly)}/mo` : ""}
                  </p>
                </div>
              );
            })}
            {featuredVinsDraft.length === 0 && <p className="text-sm text-ink-600">No featured cars selected for the landing page.</p>}
          </div>
        </CardContent>
      </Card>

      <Card ref={manualVehicleControlRef} className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-brand-600" />
            Manual Vehicle Control (Super Admin)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-600">
            Save VINs here to create editable static specials, then control the homepage featured 6 list.
          </p>
          <div className="grid gap-2 md:grid-cols-6">
            <Input value={manualVin} onChange={(e) => setManualVin(e.target.value.toUpperCase())} placeholder="VIN*" />
            <Input value={manualYear} onChange={(e) => setManualYear(e.target.value)} placeholder="Year" />
            <Input value={manualMake} onChange={(e) => setManualMake(e.target.value)} placeholder="Make" />
            <Input value={manualModel} onChange={(e) => setManualModel(e.target.value)} placeholder="Model" />
            <Input value={manualTrim} onChange={(e) => setManualTrim(e.target.value)} placeholder="Trim" />
            <div className="flex gap-2">
              <Button size="sm" variant={manualVehicleType === "new" ? "default" : "outline"} onClick={() => setManualVehicleType("new")}>
                New
              </Button>
              <Button size="sm" variant={manualVehicleType === "used" ? "default" : "outline"} onClick={() => setManualVehicleType("used")}>
                Used
              </Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            <Input value={manualListedPrice} onChange={(e) => setManualListedPrice(e.target.value)} placeholder="Listed price" />
            <Input value={manualMsrp} onChange={(e) => setManualMsrp(e.target.value)} placeholder="MSRP" />
            <Input value={manualMileage} onChange={(e) => setManualMileage(e.target.value)} placeholder="Mileage" />
            <Input value={manualCondition} onChange={(e) => setManualCondition(e.target.value)} placeholder="Condition (new/used/cpo)" />
            <Input value={manualDealerName} onChange={(e) => setManualDealerName(e.target.value)} placeholder="Dealer name" />
            <Input value={manualDealerPhone} onChange={(e) => setManualDealerPhone(e.target.value)} placeholder="Dealer phone" />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Input value={manualListingUrl} onChange={(e) => setManualListingUrl(e.target.value)} placeholder="Listing URL" />
            <Input value={manualDownPayment} onChange={(e) => setManualDownPayment(e.target.value)} placeholder="Down payment" />
            <Input value={manualMonthlyPayment} onChange={(e) => setManualMonthlyPayment(e.target.value)} placeholder="Monthly payment" />
          </div>
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink-900">Photos</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" type="button" onClick={addManualPhotoInput}>
                  Add Photo
                </Button>
                <label
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium ${
                    uploadManualVehiclePhotoMutation.isPending
                      ? "cursor-not-allowed border-ink-200 bg-ink-100 text-ink-400"
                      : "border-ink-300 bg-white text-ink-800 hover:bg-ink-100"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadManualVehiclePhotoMutation.isPending}
                    onChange={onManualPhotoFileSelected}
                  />
                  <Upload className="h-3.5 w-3.5" />
                  {uploadManualVehiclePhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
                </label>
              </div>
            </div>
            <p className="mb-2 text-xs text-ink-600">The first photo is used as the primary vehicle image. Upload supports JPG, PNG, WEBP.</p>
            <div className="space-y-2">
              {manualPhotoUrls.map((photoUrl, index) => (
                <div
                  key={`manual-photo-${index}`}
                  className={`grid gap-2 rounded-md p-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center ${
                    index === 0 ? "border border-brand-300 bg-brand-50/40" : "border border-transparent"
                  }`}
                >
                  <Input
                    value={photoUrl}
                    onChange={(e) => updateManualPhotoInput(index, e.target.value)}
                    placeholder={`Photo URL ${index + 1}`}
                  />
                  <div className="h-14 w-20 overflow-hidden rounded-md border border-ink-200 bg-white">
                    {photoUrl.trim() ? (
                      <img src={photoUrl.trim()} alt={`Manual vehicle photo ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-400">Preview</div>
                    )}
                  </div>
                  {index === 0 ? (
                    <span className="justify-self-start rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">Primary</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => makeManualPhotoPrimary(index)}
                      className="justify-self-start"
                    >
                      Make Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => removeManualPhotoInput(index)}
                    className="justify-self-start text-ink-600 hover:text-ink-900"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <Input value={manualDiscountedPrice} onChange={(e) => setManualDiscountedPrice(e.target.value)} placeholder="Discounted price" />
            <div className="md:col-span-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={upsertManualVehicleMutation.isPending || !manualVin.trim()}
                onClick={() =>
                  confirmAction(
                    `Save manual vehicle ${manualVin.trim().toUpperCase()}?`,
                    saveManualVehicle,
                    "This will create or update a manual inventory vehicle."
                  )
                }
              >
                Save Manual Vehicle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  confirmAction(
                    "Clear the manual vehicle form?",
                    resetManualVehicleForm,
                    "This only clears the fields on this page (it does not change inventory)."
                  )
                }
              >
                Clear Form
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value.toUpperCase())}
              placeholder="Search manual vehicles by VIN or Y/M/M"
              className="max-w-md"
            />
            <Button size="sm" variant="outline" onClick={() => manualVehiclesQuery.refetch()} disabled={manualVehiclesQuery.isFetching}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            {manualVehicles.map((item) => (
              <div key={item.vin} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">
                    {item.year ?? "-"} {item.make ?? ""} {item.model ?? ""} {item.trim ?? ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => populateManualVehicleForm(item)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteManualVehicleMutation.isPending}
                      onClick={() =>
                        confirmAction(
                          `Delete manual vehicle ${item.vin}?`,
                          () => deleteManualVehicleMutation.mutate(item.vin),
                          "This removes the manual vehicle record."
                        )
                      }
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const vin = item.vin?.trim().toUpperCase();
                        if (!vin) return;
                        const result = addVinToFeaturedDraft(vin);
                        if (result === "already") return;
                        if (result === "full") {
                          toast({
                            variant: "error",
                            title: "Featured list full",
                            description: `You can select up to ${homepageFeaturedLimit} vehicles.`
                          });
                          return;
                        }
                      }}
                    >
                      Add to Featured
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-ink-600">
                  VIN {item.vin} | {item.vehicle_type ?? "-"} | Price: {formatCurrency(item.listed_price ?? item.msrp)} | Monthly:{" "}
                  {formatCurrency(item.monthly_payment)}
                </p>
              </div>
            ))}
            {manualVehicles.length === 0 && <p className="text-sm text-ink-600">No manual vehicles found.</p>}
          </div>
        </CardContent>
      </Card>

      <SeoSettingsCard {...seoSettingsCardProps} />
    </>
  );
}
