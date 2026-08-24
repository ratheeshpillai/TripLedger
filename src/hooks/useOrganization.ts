import { useEffect, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { OrganizationService } from "../services/organizationService";
import type { OrganizationScope } from "../types/organization";
import { getSafeErrorMessage, logDevError } from "../utils/errors";

export function useOrganization(userId: string | null, service: OrganizationService = appServices.organization) {
  const [scope, setScope] = useState<OrganizationScope | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setScope(null);
    setError("");
    setLoading(Boolean(userId));
    if (!userId) return () => { active = false; };

    void service.getDefaultOrganization(userId).then(
      (organization) => {
        if (active) setScope({ organizationId: organization.id, userId, businessType: organization.businessType, role: organization.role });
      },
      (loadError) => {
        if (!active) return;
        logDevError("Organization resolution failed", loadError);
        setError(getSafeErrorMessage(loadError, "unexpected"));
      }
    ).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [userId, service]);

  return { scope, loading, error };
}
