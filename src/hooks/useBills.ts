import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { billService, type BillService } from "../services/billService";
import type { Bill, BillDraft } from "../types/bill";
import { calculateBillDraft, calculateBillTotal } from "../utils/calculations";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";
import { createRequestId } from "../utils/requestId";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBills(userId: string | null, service: BillService = billService) {
  const [billState, setBillState] = useState<{ userId: string | null; bills: Bill[] }>({ userId: null, bills: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(userId));
  const savePromiseRef = useRef<Promise<Bill> | null>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const deletePromiseByIdRef = useRef(new Map<string, Promise<void>>());
  const bulkDeletePromiseRef = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    requestGuardRef.current.changeOwner(userId);
    setBillState({ userId, bills: [] });
    setSelectedIds([]);
    setError("");
    setSaving(false);
    setDeletingIds([]);
    savePromiseRef.current = null;
    createRequestIdRef.current = null;
    deletePromiseByIdRef.current.clear();
    bulkDeletePromiseRef.current = null;
    setLoading(Boolean(userId));
  }, [userId]);

  async function refresh() {
    const requestUserId = userId;
    if (!requestUserId || !requestGuardRef.current.isOwnerActive(requestUserId)) return;

    const requestTicket = requestGuardRef.current.begin(requestUserId);
    const isCurrentRequest = () => requestGuardRef.current.isCurrent(requestTicket);

    try {
      setError("");
      setLoading(true);
      const saved = await service.listBills(requestUserId);
      if (!isCurrentRequest()) return;
      setBillState({ userId: requestUserId, bills: saved });
    } catch (billError) {
      if (!isCurrentRequest()) return;
      logDevError("Bill refresh failed", billError);
      setError(getSafeErrorMessage(billError, "bill.load"));
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [userId]);

  const bills = billState.userId === userId ? billState.bills : [];

  async function saveBill(draft: BillDraft, editingBillId?: string | null) {
    if (!userId) throw new Error("You must be logged in to save bills.");
    if (savePromiseRef.current) return savePromiseRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const now = new Date().toISOString();
      const calculated = calculateBillDraft(draft);

      if (editingBillId) {
        const existing = bills.find((bill) => bill.id === editingBillId);
        const updated: Bill = {
          ...calculated,
          id: editingBillId,
          userId,
          totalAmount: calculateBillTotal(calculated),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        };
        let saved: Bill;
        try {
          saved = await service.updateBill(userId, updated);
        } catch (billError) {
          logDevError("Bill update failed", billError);
          throw billError;
        }
        if (requestGuardRef.current.isOwnerActive(userId)) await refresh();
        return saved;
      }

      const bill: Bill = {
        ...calculated,
        id: createId(),
        userId,
        totalAmount: calculateBillTotal(calculated),
        createdAt: now,
        updatedAt: now
      };
      let saved: Bill;
      try {
        createRequestIdRef.current = createRequestIdRef.current ?? createRequestId();
        saved = await service.saveBill(userId, bill, createRequestIdRef.current);
        createRequestIdRef.current = null;
      } catch (billError) {
        logDevError("Bill save failed", billError);
        throw billError;
      }
      if (requestGuardRef.current.isOwnerActive(userId)) await refresh();
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
    if (!userId) throw new Error("You must be logged in to delete bills.");
    const existingDelete = deletePromiseByIdRef.current.get(id);
    if (existingDelete) return existingDelete;

    const deletePromise = (async () => {
      setDeletingIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      try {
        await service.deleteBill(userId, id);
      } catch (billError) {
        logDevError("Bill delete failed", billError);
        throw billError;
      }
      if (!requestGuardRef.current.isOwnerActive(userId)) return;
      setSelectedIds((ids) => ids.filter((item) => item !== id));
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
    if (!userId) throw new Error("You must be logged in to delete bills.");
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;
    if (bulkDeletePromiseRef.current) return bulkDeletePromiseRef.current;

    const deletePromise = (async () => {
      setDeletingIds((currentIds) => [...new Set([...currentIds, ...uniqueIds])]);
      try {
        await service.deleteBills(userId, uniqueIds);
      } catch (billError) {
        logDevError("Bill bulk delete failed", billError);
        throw billError;
      }
      if (!requestGuardRef.current.isOwnerActive(userId)) return;
      setSelectedIds((currentIds) => currentIds.filter((id) => !uniqueIds.includes(id)));
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

  function toggleSelected(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function selectAll(ids: string[]) {
    setSelectedIds(ids);
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  const selectedBills = useMemo(() => bills.filter((bill) => selectedIds.includes(bill.id)), [bills, selectedIds]);

  return {
    bills,
    loading,
    saving,
    deletingIds,
    error,
    selectedIds,
    selectedBills,
    saveBill,
    deleteBill,
    deleteBills,
    toggleSelected,
    selectAll,
    clearSelection,
    refresh
  };
}
