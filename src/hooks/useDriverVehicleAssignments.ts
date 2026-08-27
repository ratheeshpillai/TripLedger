import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { DriverVehicleAssignmentService } from "../services/driverVehicleAssignmentService";
import type { DriverVehicleAssignment } from "../types/driverVehicleAssignment";
import type { OrganizationScope } from "../types/organization";
import { AppError, getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

export function useDriverVehicleAssignments(scope: OrganizationScope | null, enabled: boolean, service: DriverVehicleAssignmentService = appServices.driverVehicleAssignments) {
  const scopeKey = scope && enabled ? `${scope.userId}:${scope.organizationId}` : null;
  const [assignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(scopeKey));
  const [savingVehicleId, setSavingVehicleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));

  async function loadAssignments(activeScope: OrganizationScope, ownerKey: string) {
    const ticket = requestGuardRef.current.begin(ownerKey);
    try {
      const next = await service.listAssignments(activeScope);
      if (requestGuardRef.current.isCurrent(ticket)) setAssignments(next);
    } catch (loadError) {
      if (!requestGuardRef.current.isCurrent(ticket)) return;
      logDevError("Driver vehicle assignment list failed", loadError);
      setError(getSafeErrorMessage(loadError, "assignment.load"));
    } finally {
      if (requestGuardRef.current.isCurrent(ticket)) setLoading(false);
    }
  }

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setAssignments([]);
    setError("");
    setLoading(Boolean(scopeKey));
    setSavingVehicleId(null);
    if (scope && scopeKey) void loadAssignments(scope, scopeKey);
  }, [scopeKey, service]);

  async function changeAssignment(vehicleId: string, driverId?: string) {
    if (!scope || !scopeKey) throw new AppError("UNAUTHORIZED");
    setSavingVehicleId(vehicleId);
    try {
      const saved = driverId
        ? await service.assignDriver(scope, vehicleId, driverId)
        : await service.endAssignment(scope, vehicleId);
      await loadAssignments(scope, scopeKey);
      return saved;
    } finally {
      setSavingVehicleId(null);
    }
  }

  return {
    assignments,
    loading,
    savingVehicleId,
    error,
    assignDriver: (vehicleId: string, driverId: string) => changeAssignment(vehicleId, driverId),
    endAssignment: (vehicleId: string) => changeAssignment(vehicleId)
  };
}
