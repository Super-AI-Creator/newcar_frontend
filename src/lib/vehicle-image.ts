import type { Vehicle } from "@/lib/api";

export const DEFAULT_CAR_IMAGE = "/images/default.jpg";

/** Feed-sourced inventory uses this sentinel on carfax_url; those rows may include many photo URLs. */
export function isFeedCsvVehicle(
  vehicle: Pick<Vehicle, "carfax_url" | "history_url" | "vehicle_history_url"> | null | undefined
): boolean {
  const markers = [vehicle?.carfax_url, vehicle?.history_url, vehicle?.vehicle_history_url].map((s) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
  );
  return markers.some((m) => m === "feed_csv");
}

export function pickVehicleImage(vehicle: Pick<Vehicle, "photo" | "photos">): string {
  const primary = vehicle.photo?.trim();
  if (primary) return primary;

  const backup = vehicle.photos?.find((url) => typeof url === "string" && url.trim());
  if (backup) return backup;

  return DEFAULT_CAR_IMAGE;
}
