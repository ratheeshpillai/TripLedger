import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { DriverService } from "../services/driverService";
import type { Driver, DriverDraft, DriverStatus } from "../types/driver";
import type { OrganizationScope } from "../types/organization";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
}

export function useDrivers(scope: OrganizationScope | null, enabled: boolean, service: DriverService = appServices.drivers) {
  const scopeKey = scope && enabled ? `${scope.userId}:${scope.organizationId}` : null;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(Boolean(scopeKey));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setDrivers([]);
    setError("");
    setLoading(Boolean(scopeKey));
    setSavingId(null);

    if (!scope || !scopeKey) return;
    const ticket = requestGuardRef.current.begin(scopeKey);
    void service.listDrivers(scope).then(
      (next) => {
        if (requestGuardRef.current.isCurrent(ticket)) setDrivers(sortDrivers(next));
      },
      (loadError) => {
        if (!requestGuardRef.current.isCurrent(ticket)) return;
        logDevError("Driver list failed", loadError);
        setError(getSafeErrorMessage(loadError, "driver.load"));
      }
    ).finally(() => {
      if (requestGuardRef.current.isCurrent(ticket)) setLoading(false);
    });
  }, [scopeKey, service]);

  async function saveDriver(draft: DriverDraft, id?: string) {
    if (!scope) throw new Error("You must be logged in to save a driver.");
    setSavingId(id ?? "new");
    try {
      const saved = id
        ? await service.updateDriver(scope, id, draft)
        : await service.createDriver(scope, draft);
      setDrivers((current) => sortDrivers(id
        ? current.map((driver) => driver.id === id ? saved : driver)
        : [...current, saved]));
      return saved;
    } finally {
      setSavingId(null);
    }
  }

  function setDriverStatus(driver: Driver, status: DriverStatus) {
    return saveDriver({ name: driver.name, phone: driver.phone, status }, driver.id);
  }

  return { drivers, loading, savingId, error, saveDriver, setDriverStatus };
}
