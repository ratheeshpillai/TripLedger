import type { Bill } from "../types/bill";
import type { BillRepository } from "../repositories/billRepository";
import { supabaseBillRepository } from "../repositories/supabase/supabaseBillRepository";

export interface BillService {
  listBills(userId: string): Promise<Bill[]>;
  saveBill(userId: string, bill: Bill, requestId: string): Promise<Bill>;
  updateBill(userId: string, bill: Bill): Promise<Bill>;
  deleteBill(userId: string, id: string): Promise<void>;
  deleteBills(userId: string, ids: string[]): Promise<void>;
}

export function createBillService(repository: BillRepository): BillService {
  return {
    listBills(userId) {
      return repository.listBills(userId);
    },
    saveBill(userId, bill, requestId) {
      return repository.saveBill(userId, bill, requestId);
    },
    updateBill(userId, bill) {
      return repository.updateBill(userId, bill);
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
