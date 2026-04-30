import type { Vehicle } from "@/lib/api";

/** Treat null, non-finite, and <= 0 as “no price” for display and sorting. */
export function displayPrice(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

/** First positive finite price in order, or undefined if none. */
export function firstDisplayPrice(...values: Array<number | null | undefined>): number | undefined {
  for (const v of values) {
    const p = displayPrice(v);
    if (p !== undefined) return p;
  }
  return undefined;
}

export function resolveSearchCardPrimaryPrice(vehicle: Vehicle, isUsed: boolean): number | undefined {
  if (isUsed) {
    return firstDisplayPrice(vehicle.listed_price, vehicle.discounted, vehicle.msrp);
  }
  return firstDisplayPrice(vehicle.discounted, vehicle.msrp, vehicle.listed_price);
}
