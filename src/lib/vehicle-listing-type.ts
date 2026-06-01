/** Inventory with more than this mileage is treated as used (matches backend SQL). */
export const USED_MILEAGE_THRESHOLD = 1000;

export function inferVehicleListingType(vehicle: {
  vehicle_type?: string | null;
  condition?: string | null;
  mileage?: number | null;
}): "new" | "used" {
  const mileage =
    typeof vehicle.mileage === "number" && Number.isFinite(vehicle.mileage) ? vehicle.mileage : null;

  // Demo / feed: 0-mile units flagged used/cpo are still new.
  if (mileage === 0) {
    const normalizedCondition = (vehicle.condition ?? "").toString().toLowerCase();
    const normalizedType = (vehicle.vehicle_type ?? "new").toString().toLowerCase();
    if (normalizedCondition === "used" || normalizedCondition === "cpo" || normalizedType === "used") {
      return "new";
    }
  }

  if (mileage !== null && mileage > USED_MILEAGE_THRESHOLD) {
    return "used";
  }

  const normalizedCondition = (vehicle.condition ?? "").toString().toLowerCase();
  if (normalizedCondition === "new") return "new";
  if (normalizedCondition === "used" || normalizedCondition === "cpo") return "used";

  const normalizedType = (vehicle.vehicle_type ?? "new").toString().toLowerCase();
  if (normalizedType === "used") return "used";
  return "new";
}
