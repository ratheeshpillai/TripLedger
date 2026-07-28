import type { Bill } from "../types/bill";
import type { BillRepository } from "../repositories/billRepository";
import { supabaseBillRepository } from "../repositories/supabase/supabaseBillRepository";
import { BillValidationError, normalizeBillDraft, validateBillDraft } from "../utils/billValidation";

export interface BillService {
  listBills(userId: string): Promise<Bill[]>;
  saveBill(userId: string, bill: Bill, requestId: string): Promise<Bill>;
  updateBill(userId: string, bill: Bill): Promise<Bill>;
  deleteBill(userId: string, id: string): Promise<void>;
  deleteBills(userId: string, ids: string[]): Promise<void>;
}

export function createBillService(repository: BillRepository): BillService {
  function validBill(bill: Bill): Bill {
    const rawErrors = validateBillDraft(bill);
    if (Object.keys(rawErrors).length > 0) throw new BillValidationError(rawErrors);
    const normalized = normalizeBillDraft(bill);
    const errors = validateBillDraft(normalized);
    if (Object.keys(errors).length > 0) throw new BillValidationError(errors);
    return { ...bill, ...normalized };
  }

  return {
    listBills(userId) {
      return repository.listBills(userId);
    },
    saveBill(userId, bill, requestId) {
      return repository.saveBill(userId, validBill(bill), requestId);
    },
    updateBill(userId, bill) {
      return repository.updateBill(userId, validBill(bill));
    },
    deleteBill(userId, id) {
      return repository.deleteBill(userId, id);
    },
    deleteBills(userId, ids) {
      return repository.deleteBills(userId, ids);
    }
  };
}

export const billService = createBillService(supabaseBillRepository);
