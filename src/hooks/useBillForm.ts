import { useEffect, useMemo, useState } from "react";
import { createEmptyBillDraft } from "../constants/defaults";
import type { Bill, BillDraft } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { calculateBillDraft, calculateBillTotal } from "../utils/calculations";
import { subtractOneHour } from "../utils/timeUtils";

export function useBillForm(settings: AppSettings) {
  const [draft, setDraft] = useState<BillDraft>(() => createEmptyBillDraft(settings));
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [garageAutoMode, setGarageAutoMode] = useState(true);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      basePackage: current.basePackage || settings.defaultBasePackage,
      baseHours: current.baseHours || settings.defaultBaseHours,
      baseKm: current.baseKm || settings.defaultBaseKm,
      baseAmount: current.baseAmount || settings.defaultBaseAmount,
      extraHourRate: current.extraHourRate || settings.defaultExtraHourRate,
      extraKmRate: current.extraKmRate || settings.defaultExtraKmRate
    }));
  }, [settings]);

  const calculatedDraft = useMemo(() => calculateBillDraft(draft), [draft]);

  function updateField<K extends keyof BillDraft>(field: K, value: BillDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "reportingTime" && garageAutoMode) {
        next.garageTime = subtractOneHour(String(value));
      }
      if (field === "tripDate" && !current.closingDate) {
        next.closingDate = String(value);
      }
      if (["tripDate", "garageTime", "closingDate", "closingTime", "baseHours", "extraHourRate"].includes(String(field))) {
        next.extraHourAmount = 0;
      }
      if (["totalKm", "baseKm", "extraKmRate"].includes(String(field))) {
        next.extraKm = 0;
        next.extraKmAmount = 0;
      }
      if (["extraKm", "extraKmAmount", "extraHourAmount"].includes(String(field))) {
        return { ...next, totalAmount: calculateBillTotal(next) };
      }
      return calculateBillDraft(next);
    });
  }

  function setGarageTime(value: string) {
    setGarageAutoMode(false);
    updateField("garageTime", value);
  }

  function loadForEdit(bill: Bill) {
    setEditingBillId(bill.id);
    setGarageAutoMode(true);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...billDraft } = bill;
    setDraft(billDraft);
  }

  function duplicateBill(bill: Bill) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...billDraft } = bill;
    setEditingBillId(null);
    setGarageAutoMode(true);
    setDraft({ ...billDraft, guestName: `${billDraft.guestName} Copy`.trim() });
  }

  function resetLogger() {
    setDraft(createEmptyBillDraft(settings));
    setEditingBillId(null);
    setGarageAutoMode(true);
  }

  return {
    draft: calculatedDraft,
    editingBillId,
    garageAutoMode,
    updateField,
    setGarageTime,
    loadForEdit,
    duplicateBill,
    resetLogger,
    setEditingBillId
  };
}
