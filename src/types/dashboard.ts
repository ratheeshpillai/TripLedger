export type DashboardPeriod = "today" | "week" | "month";

export type DashboardActivity = {
  id: string;
  type: "bill" | "payment" | "owner";
  recordId: string;
  title: string;
  amount?: number;
  businessDate?: string;
  timestamp: string;
};

export type DashboardTopOwner = {
  billingPartyId: string;
  name: string;
  billedAmount: number;
  outstandingAmount: number;
};

export type MonthlyBillingPoint = {
  monthKey: string;
  monthLabel: string;
  fullMonthLabel: string;
  amount: number;
};

export type DashboardData = {
  billingTotal: number;
  tripsBilled: number;
  paymentsReceived: number;
  currentOutstanding: number;
  outstandingOwners: number;
  advanceOwners: number;
  totalAdvance: number;
  recentActivity: DashboardActivity[];
  topOwnersThisMonth: DashboardTopOwner[];
  monthlyTrend: MonthlyBillingPoint[];
};

export type DashboardQuery = {
  periodStart: string;
  periodEnd: string;
  firstTrendMonth: string;
  currentMonthStart: string;
  recentLimit: number;
  topOwnerLimit: number;
};
