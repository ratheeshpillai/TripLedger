import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { DashboardService } from "../services/dashboardService";
import type { DashboardData, DashboardPeriod, DashboardQuery } from "../types/dashboard";
import type { OrganizationScope } from "../types/organization";
import { getSafeErrorMessage, logDevError } from "../utils/errors";

function inputDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dashboardQuery(period: DashboardPeriod, now = new Date()): DashboardQuery {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "month") start.setDate(1);
  const firstTrendMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return {
    periodStart: inputDate(start),
    periodEnd: inputDate(now),
    firstTrendMonth: inputDate(firstTrendMonth),
    currentMonthStart: inputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    recentLimit: 5,
    topOwnerLimit: 3
  };
}

export function useDashboard(scope: OrganizationScope | null, enabled: boolean, service: DashboardService = appServices.dashboard) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  async function refresh() {
    if (!scope || !enabled) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const next = await service.getDashboard(scope, dashboardQuery(period));
      if (requestRef.current === requestId) setData(next);
    } catch (loadError) {
      if (requestRef.current !== requestId) return;
      logDevError("Dashboard refresh failed", loadError);
      setError(getSafeErrorMessage(loadError, "unexpected"));
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }

  useEffect(() => {
    if (enabled) void refresh();
    else requestRef.current += 1;
  }, [scope?.organizationId, enabled, period, service]);

  return { data, period, setPeriod, loading: loading || Boolean(scope && enabled && !data && !error), error, refresh };
}
