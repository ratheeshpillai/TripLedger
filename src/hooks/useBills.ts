import { useEffect, useMemo, useState } from "react";
import { localStorageBillService } from "../services/localStorageBillService";
import type { BillService } from "../services/billService";
import type { Bill, BillDraft } from "../types/bill";
import { calculateBillDraft, calculateBillTotal } from "../utils/calculations";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBills(service: BillService = localStorageBillService) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const saved = await service.listBills();
    setBills(saved);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveBill(draft: BillDraft, editingBillId?: string | null) {
    const now = new Date().toISOString();
    const calculated = calculateBillDraft(draft);

    if (editingBillId) {
      const existing = bills.find((bill) => bill.id === editingBillId);
      const updated: Bill = {
        ...calculated,
        id: editingBillId,
        totalAmount: calculateBillTotal(calculated),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      await service.updateBill(updated);
      await refresh();
      return updated;
    }

    const bill: Bill = {
      ...calculated,
      id: createId(),
      totalAmount: calculateBillTotal(calculated),
      createdAt: now,
      updatedAt: now
    };
    await service.saveBill(bill);
    await refresh();
    return bill;
  }

  async function deleteBill(id: string) {
    await service.deleteBill(id);
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
