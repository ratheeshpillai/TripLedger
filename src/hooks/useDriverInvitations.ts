import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { DriverInvitationService } from "../services/driverInvitationService";
import type { DriverInvitation } from "../types/driverInvitation";
import type { OrganizationScope } from "../types/organization";
import { AppError, getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

export function useDriverInvitations(scope: OrganizationScope | null, enabled: boolean, service: DriverInvitationService = appServices.driverInvitations) {
  const scopeKey = scope && enabled ? `${scope.userId}:${scope.organizationId}` : null;
  const [invitations, setInvitations] = useState<DriverInvitation[]>([]);
  const [loading, setLoading] = useState(Boolean(scopeKey));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setInvitations([]);
    setError("");
    setLoading(Boolean(scopeKey));
    setSavingId(null);
    if (!scope || !scopeKey) return;

    const ticket = requestGuardRef.current.begin(scopeKey);
    void service.listInvitations(scope).then(
      (next) => requestGuardRef.current.isCurrent(ticket) && setInvitations(next),
      (loadError) => {
        if (!requestGuardRef.current.isCurrent(ticket)) return;
        logDevError("Driver invitation list failed", loadError);
        setError(getSafeErrorMessage(loadError, "invitation.load"));
      }
    ).finally(() => requestGuardRef.current.isCurrent(ticket) && setLoading(false));
  }, [scopeKey, service]);

  async function createInvitation(driverId: string, email: string) {
    if (!scope) throw new AppError("UNAUTHORIZED");
    setSavingId(driverId);
    try {
      const created = await service.createInvitation(scope, driverId, email);
      setInvitations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      return created;
    } finally {
      setSavingId(null);
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!scope) throw new AppError("UNAUTHORIZED");
    setSavingId(invitationId);
    try {
      const cancelled = await service.cancelInvitation(scope, invitationId);
      setInvitations((current) => current.map((item) => item.id === cancelled.id ? cancelled : item));
      return cancelled;
    } finally {
      setSavingId(null);
    }
  }

  return { invitations, loading, savingId, error, createInvitation, cancelInvitation };
}
