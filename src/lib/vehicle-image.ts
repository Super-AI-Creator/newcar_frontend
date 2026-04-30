import type { Vehicle } from "@/lib/api";

export const DEFAULT_CAR_IMAGE = "/images/default.jpg";

export function pickVehicleImage(vehicle: Pick<Vehicle, "photo" | "photos">): string {
  const primary = vehicle.photo?.trim();
  if (primary) return primary;

  const backup = vehicle.photos?.find((url) => typeof url === "string" && url.trim());
  if (backup) return backup;

  return DEFAULT_CAR_IMAGE;
}
