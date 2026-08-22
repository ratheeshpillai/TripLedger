import { useEffect, useMemo, useState } from "react";
import type { BillQuery } from "../../types/bill";
import {
  buildHistoryQuery,
  emptyHistoryFilters,
  historyRowsPerPageOptions,
  historySortKey,
  isHistorySortOption,
  paginationPages,
  type AppliedFilters,
  type DateRange,
  type HistorySortOption
} from "./historyPageModel";

export function useHistoryQueryState(userId: string, totalCount: number, onQuery: (query: BillQuery) => Promise<void>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<HistorySortOption>(() => {
    const saved = window.localStorage.getItem(historySortKey(userId));
    return isHistorySortOption(saved) ? saved : "newest";
  });
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(emptyHistoryFilters);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(emptyHistoryFilters);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);

  const query = useMemo(() => buildHistoryQuery({ page, pageSize: rowsPerPage, search, dateRange, filters: appliedFilters, sort }), [appliedFilters, dateRange, page, rowsPerPage, search, sort]);
  const pageCount = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => setPage(1), [appliedFilters, dateRange, rowsPerPage, search, sort]);
  useEffect(() => { void onQuery(query); }, [query]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    const saved = window.localStorage.getItem(historySortKey(userId));
    setSort(isHistorySortOption(saved) ? saved : "newest");
  }, [userId]);

  function changeSort(value: HistorySortOption) {
    setSort(value);
    window.localStorage.setItem(historySortKey(userId), value);
  }

  return {
    search,
    setSearch,
    sort,
    changeSort,
    dateRange,
    setDateRange,
    draftFilters,
    setDraftFilters,
    appliedFilters,
    setAppliedFilters,
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    query,
    pageCount,
    currentPage,
    pageStart: totalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1,
    pageEnd: Math.min(totalCount, currentPage * rowsPerPage),
    visiblePages: paginationPages(currentPage, pageCount),
    showPaginationControls: pageCount > 1,
    showRowsPerPage: totalCount > historyRowsPerPageOptions[0]
  };
}
