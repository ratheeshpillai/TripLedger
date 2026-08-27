import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { VehicleService } from "../services/vehicleService";
import type { OrganizationScope } from "../types/organization";
import type { Vehicle, VehicleDraft, VehicleStatus } from "../types/vehicle";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

function sortVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => a.status.localeCompare(b.status) || a.registrationNumber.localeCompare(b.registrationNumber));
}

export function useVehicles(scope: OrganizationScope | null, enabled: boolean, service: VehicleService = appServices.vehicles) {
  const scopeKey = scope && enabled ? `${scope.userId}:${scope.organizationId}` : null;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(Boolean(scopeKey));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setVehicles([]);
    setError("");
    setLoading(Boolean(scopeKey));
    setSavingId(null);

    if (!scope || !scopeKey) return;
    const ticket = requestGuardRef.current.begin(scopeKey);
    void service.listVehicles(scope).then(
      (next) => {
        if (requestGuardRef.current.isCurrent(ticket)) setVehicles(sortVehicles(next));
      },
      (loadError) => {
        if (!requestGuardRef.current.isCurrent(ticket)) return;
        logDevError("Vehicle list failed", loadError);
        setError(getSafeErrorMessage(loadError, "vehicle.load"));
      }
    ).finally(() => {
      if (requestGuardRef.current.isCurrent(ticket)) setLoading(false);
    });
  }, [scopeKey, service]);

  async function saveVehicle(draft: VehicleDraft, id?: string) {
    if (!scope) throw new Error("You must be logged in to save a vehicle.");
    setSavingId(id ?? "new");
    try {
      const saved = id
        ? await service.updateVehicle(scope, id, draft)
        : await service.createVehicle(scope, draft);
      setVehicles((current) => sortVehicles(id
        ? current.map((vehicle) => vehicle.id === id ? saved : vehicle)
        : [...current, saved]));
      return saved;
    } finally {
      setSavingId(null);
    }
  }

  function setVehicleStatus(vehicle: Vehicle, status: VehicleStatus) {
    return saveVehicle({
      registrationNumber: vehicle.registrationNumber,
      displayName: vehicle.displayName,
      makeModel: vehicle.makeModel,
      year: vehicle.year,
      status
    }, vehicle.id);
  }

  return { vehicles, loading, savingId, error, saveVehicle, setVehicleStatus };
}
