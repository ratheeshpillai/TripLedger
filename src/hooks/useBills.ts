import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { billService, type BillService } from "../services/billService";
import type { Bill, BillDraft } from "../types/bill";
import { calculateBillDraft, calculateBillTotal } from "../utils/calculations";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBills(userId: string | null, service: BillService = billService) {
  const [billState, setBillState] = useState<{ userId: string | null; bills: Bill[] }>({ userId: null, bills: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(userId));

  useLayoutEffect(() => {
    requestGuardRef.current.changeOwner(userId);
    setBillState({ userId, bills: [] });
    setSelectedIds([]);
    setError("");
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
      try {
        await service.updateBill(userId, updated);
      } catch (billError) {
        logDevError("Bill update failed", billError);
        throw billError;
      }
      if (requestGuardRef.current.isOwnerActive(userId)) await refresh();
      return updated;
    }

    const bill: Bill = {
      ...calculated,
      id: createId(),
      userId,
      totalAmount: calculateBillTotal(calculated),
      createdAt: now,
      updatedAt: now
    };
    try {
      await service.saveBill(userId, bill);
    } catch (billError) {
      logDevError("Bill save failed", billError);
      throw billError;
    }
    if (requestGuardRef.current.isOwnerActive(userId)) await refresh();
    return bill;
  }

  async function deleteBill(id: string) {
    if (!userId) throw new Error("You must be logged in to delete bills.");
    try {
      await service.deleteBill(userId, id);
    } catch (billError) {
      logDevError("Bill delete failed", billError);
      throw billError;
    }
    if (!requestGuardRef.current.isOwnerActive(userId)) return;
    setSelectedIds((ids) => ids.filter((item) => item !== id));
    await refresh();
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
    error,
    selectedIds,
    selectedBills,
    saveBill,
    deleteBill,
    toggleSelected,
    selectAll,
    clearSelection,
    refresh
  };
}
