import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { BillService } from "../services/billService";
import type { Bill, BillDraft, BillQuery, PagedBills } from "../types/bill";
import type { OrganizationScope } from "../types/organization";
import { calculateBillDraft, calculateBillTotal } from "../utils/calculations";
import { billSelectionKey } from "../utils/billQuery";
import { DuplicateBillError, getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";
import { createRequestId } from "../utils/requestId";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBills(scope: OrganizationScope | null, service: BillService = appServices.bills) {
  const scopeKey = scope ? `${scope.userId}:${scope.organizationId}` : null;
  const [billState, setBillState] = useState<{ scopeKey: string | null; result: PagedBills }>({ scopeKey: null, result: { items: [], totalCount: 0, totalAmount: 0 } });
  const [selectedBills, setSelectedBills] = useState<Bill[]>([]);
  const [selectedQueryKey, setSelectedQueryKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));
  const savePromiseRef = useRef<Promise<Bill> | null>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const deletePromiseByIdRef = useRef(new Map<string, Promise<void>>());
  const bulkDeletePromiseRef = useRef<Promise<void> | null>(null);
  const queryRef = useRef<BillQuery | null>(null);

  useLayoutEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setBillState({ scopeKey, result: { items: [], totalCount: 0, totalAmount: 0 } });
    setSelectedBills([]);
    setSelectedQueryKey("");
    setError("");
    setSaving(false);
    setDeletingIds([]);
    savePromiseRef.current = null;
    createRequestIdRef.current = null;
    deletePromiseByIdRef.current.clear();
    bulkDeletePromiseRef.current = null;
    setLoading(false);
    queryRef.current = null;
  }, [scopeKey]);

  async function queryBills(query: BillQuery) {
    const requestScope = scope;
    if (!requestScope || !scopeKey || !requestGuardRef.current.isOwnerActive(scopeKey)) return;
    queryRef.current = query;

    const requestTicket = requestGuardRef.current.begin(scopeKey);
    const isCurrentRequest = () => requestGuardRef.current.isCurrent(requestTicket);

    try {
      setError("");
      setLoading(true);
      const saved = await service.queryBills(requestScope, query);
      if (!isCurrentRequest()) return;
      setBillState({ scopeKey, result: saved });
    } catch (billError) {
      if (!isCurrentRequest()) return;
      logDevError("Bill refresh failed", billError);
      setError(getSafeErrorMessage(billError, "bill.load"));
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  async function refresh() {
    if (queryRef.current) await queryBills(queryRef.current);
  }

  const result = billState.scopeKey === scopeKey ? billState.result : { items: [], totalCount: 0, totalAmount: 0 };
  const bills = result.items;

  async function saveBill(draft: BillDraft, editingBillId?: string | null) {
    if (!scope || !scopeKey) throw new Error("You must be logged in to save bills.");
    if (savePromiseRef.current) return savePromiseRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const now = new Date().toISOString();
      const calculated = calculateBillDraft(draft);

      if (editingBillId) {
        const updated: Bill = {
          ...calculated,
          id: editingBillId,
          organizationId: scope.organizationId,
          userId: scope.userId,
          totalAmount: calculateBillTotal(calculated),
          createdAt: now,
          updatedAt: now
        };
        let saved: Bill;
        try {
          saved = await service.updateBill(scope, updated);
        } catch (billError) {
          logDevError("Bill update failed", billError);
          throw billError;
        }
        if (requestGuardRef.current.isOwnerActive(scopeKey)) void refresh();
        return saved;
      }

      const bill: Bill = {
        ...calculated,
        id: createId(),
        organizationId: scope.organizationId,
        userId: scope.userId,
        totalAmount: calculateBillTotal(calculated),
        createdAt: now,
        updatedAt: now
      };
      let saved: Bill;
      try {
        createRequestIdRef.current = createRequestIdRef.current ?? createRequestId();
        saved = await service.saveBill(scope, bill, createRequestIdRef.current);
        createRequestIdRef.current = null;
      } catch (billError) {
        if (billError instanceof DuplicateBillError) createRequestIdRef.current = null;
        logDevError("Bill save failed", billError);
        throw billError;
      }
      if (requestGuardRef.current.isOwnerActive(scopeKey)) void refresh();
      return saved;
    })();

    savePromiseRef.current = savePromise;
    try {
      return await savePromise;
    } finally {
      if (savePromiseRef.current === savePromise) savePromiseRef.current = null;
      setSaving(false);
    }
  }

  async function deleteBill(id: string) {
    if (!scope || !scopeKey) throw new Error("You must be logged in to delete bills.");
    const existingDelete = deletePromiseByIdRef.current.get(id);
    if (existingDelete) return existingDelete;

    const deletePromise = (async () => {
      setDeletingIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      try {
        await service.deleteBill(scope, id);
      } catch (billError) {
        logDevError("Bill delete failed", billError);
        throw billError;
      }
      if (!requestGuardRef.current.isOwnerActive(scopeKey)) return;
      setSelectedBills((items) => items.filter((item) => item.id !== id));
      await refresh();
    })();

    deletePromiseByIdRef.current.set(id, deletePromise);
    try {
      await deletePromise;
    } finally {
      deletePromiseByIdRef.current.delete(id);
      setDeletingIds((ids) => ids.filter((item) => item !== id));
    }
  }

  async function deleteBills(ids: string[]) {
    if (!scope || !scopeKey) throw new Error("You must be logged in to delete bills.");
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;
    if (bulkDeletePromiseRef.current) return bulkDeletePromiseRef.current;

    const deletePromise = (async () => {
      setDeletingIds((currentIds) => [...new Set([...currentIds, ...uniqueIds])]);
      try {
        await service.deleteBills(scope, uniqueIds);
      } catch (billError) {
        logDevError("Bill bulk delete failed", billError);
        throw billError;
      }
      if (!requestGuardRef.current.isOwnerActive(scopeKey)) return;
      setSelectedBills((items) => items.filter((item) => !uniqueIds.includes(item.id)));
      await refresh();
    })();

    bulkDeletePromiseRef.current = deletePromise;
    try {
      await deletePromise;
    } finally {
      if (bulkDeletePromiseRef.current === deletePromise) bulkDeletePromiseRef.current = null;
      setDeletingIds((currentIds) => currentIds.filter((id) => !uniqueIds.includes(id)));
    }
  }

  function toggleSelected(bill: Bill) {
    setSelectedQueryKey("");
    setSelectedBills((items) => items.some((item) => item.id === bill.id)
      ? items.filter((item) => item.id !== bill.id)
      : [...items, bill]);
  }

  async function selectAll(query: BillQuery) {
    if (!scope) return;
    const selectionQuery = { ...query, page: 1, pageSize: 10000 };
    const selected = await service.queryBills(scope, selectionQuery);
    setSelectedBills(selected.items);
    setSelectedQueryKey(billSelectionKey(query));
  }

  function clearSelection() {
    setSelectedBills([]);
    setSelectedQueryKey("");
  }

  const selectedIds = useMemo(() => selectedBills.map((bill) => bill.id), [selectedBills]);

  async function getBill(id: string) {
    if (!scope) throw new Error("You must be logged in to load bills.");
    return service.getBill(scope, id);
  }

  return {
    bills,
    totalCount: result.totalCount,
    totalAmount: result.totalAmount,
    loading,
    saving,
    deletingIds,
    error,
    selectedIds,
    selectedBills,
    selectedQueryKey,
    saveBill,
    deleteBill,
    deleteBills,
    toggleSelected,
    selectAll,
    clearSelection,
    refresh,
    queryBills,
    getBill
  };
}
