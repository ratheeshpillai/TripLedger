import type { DashboardRepository } from "../dashboardRepository";
import type { DashboardActivity, MonthlyBillingPoint } from "../../types/dashboard";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";
import { logDevError } from "../../utils/errors";

type SummaryRow = Database["public"]["Functions"]["get_dashboard_summary"]["Returns"][number];
type ActivityRow = Database["public"]["Functions"]["get_dashboard_recent_activity"]["Returns"][number];
type MonthlyRow = Database["public"]["Functions"]["get_dashboard_monthly_billing"]["Returns"][number];
type TopOwnerRow = Database["public"]["Functions"]["get_dashboard_top_owners"]["Returns"][number];

function number(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function monthlyPoint(row: MonthlyRow): MonthlyBillingPoint {
  const [year, month] = row.month_start.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return {
    monthKey: row.month_start.slice(0, 7),
    monthLabel: date.toLocaleString("en-IN", { month: "short" }),
    fullMonthLabel: date.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    amount: number(row.amount)
  };
}

function activity(row: ActivityRow): DashboardActivity {
  if (row.activity_type !== "bill" && row.activity_type !== "payment" && row.activity_type !== "owner") {
    throw new Error("Unsupported dashboard activity type.");
  }
  return {
    id: `${row.activity_type}-${row.record_id}`,
    type: row.activity_type,
    recordId: row.record_id,
    title: row.title,
    amount: row.amount == null ? undefined : Number(row.amount),
    businessDate: row.business_date ?? undefined,
    timestamp: row.activity_at
  };
}

export const supabaseDashboardRepository: DashboardRepository = {
  async getDashboard(scope, query) {
    const client = getSupabaseClient();
    const [summaryResult, activityResult, monthlyResult, topOwnerResult] = await Promise.all([
      client.rpc("get_dashboard_summary", {
        p_organization_id: scope.organizationId,
        p_period_start: query.periodStart,
        p_period_end: query.periodEnd
      }).single(),
      client.rpc("get_dashboard_recent_activity", {
        p_organization_id: scope.organizationId,
        p_limit: query.recentLimit
      }),
      client.rpc("get_dashboard_monthly_billing", {
        p_organization_id: scope.organizationId,
        p_first_month: query.firstTrendMonth
      }),
      client.rpc("get_dashboard_top_owners", {
        p_organization_id: scope.organizationId,
        p_month_start: query.currentMonthStart,
        p_limit: query.topOwnerLimit
      })
    ]);

    const failed = [summaryResult, activityResult, monthlyResult, topOwnerResult].find((result) => result.error);
    if (failed?.error) {
      logDevError("Supabase dashboard query failed", failed.error);
      throw mapSupabaseError(failed.error);
    }

    const summary = summaryResult.data as SummaryRow;
    return {
      billingTotal: number(summary.billing_total),
      tripsBilled: number(summary.trips_billed),
      paymentsReceived: number(summary.payments_received),
      currentOutstanding: number(summary.current_outstanding),
      outstandingOwners: number(summary.outstanding_owners),
      advanceOwners: number(summary.advance_owners),
      totalAdvance: number(summary.total_advance),
      recentActivity: ((activityResult.data ?? []) as ActivityRow[]).map(activity),
      monthlyTrend: ((monthlyResult.data ?? []) as MonthlyRow[]).map(monthlyPoint),
      topOwnersThisMonth: ((topOwnerResult.data ?? []) as TopOwnerRow[]).map((row) => ({
        billingPartyId: row.billing_party_id,
        name: row.display_name,
        billedAmount: number(row.billed_amount),
        outstandingAmount: number(row.outstanding_amount)
      }))
    };
  }
};
