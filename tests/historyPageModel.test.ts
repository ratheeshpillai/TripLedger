import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryQuery, paginationPages, quickHistoryDateRange, validateHistoryDateRange } from "../src/components/history/historyPageModel.ts";

test("history query preserves server-side paging and normalizes optional filters", () => {
  assert.deepEqual(buildHistoryQuery({
    page: 3,
    pageSize: 50,
    search: "  airport  ",
    dateRange: { fromDate: "2026-08-01", toDate: "2026-08-20", label: "August" },
    filters: { billingPartyId: "party-1" },
    sort: "highest"
  }), {
    page: 3,
    pageSize: 50,
    search: "airport",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-20",
    billingPartyId: "party-1",
    sort: "highest"
  });

  assert.equal(buildHistoryQuery({ page: 1, pageSize: 20, search: " ", dateRange: null, filters: { billingPartyId: "" }, sort: "newest" }).search, undefined);
});

test("history date validation and pagination remain deterministic", () => {
  assert.equal(validateHistoryDateRange("", "2026-08-20"), "Choose both From Date and To Date.");
  assert.equal(validateHistoryDateRange("2026-08-21", "2026-08-20"), "From Date cannot be after To Date.");
  assert.equal(validateHistoryDateRange("2026-08-20", "2026-08-20"), "");
  assert.deepEqual(paginationPages(6, 10), [4, 5, 6, 7, 8]);
  assert.deepEqual(quickHistoryDateRange("month", new Date(2026, 7, 20)), { fromDate: "2026-08-01", toDate: "2026-08-31", label: "This Month" });
});
