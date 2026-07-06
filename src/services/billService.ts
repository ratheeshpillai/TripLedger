import type { Bill } from "../types/bill";
import type { BillRepository } from "../repositories/billRepository";
import { supabaseBillRepository } from "../repositories/supabase/supabaseBillRepository";

export interface BillService {
  listBills(userId: string): Promise<Bill[]>;
  saveBill(userId: string, bill: Bill): Promise<Bill>;
  updateBill(userId: string, bill: Bill): Promise<Bill>;
  deleteBill(userId: string, id: string): Promise<void>;
}

export function createBillService(repository: BillRepository): BillService {
  return {
    listBills(userId) {
      return repository.listBills(userId);
    },
    saveBill(userId, bill) {
      return repository.saveBill(userId, bill);
    },
    updateBill(userId, bill) {
      return repository.updateBill(userId, bill);
    },
    deleteBill(userId, id) {
      return repository.deleteBill(userId, id);
    }
  };
}

export const billService = createBillService(supabaseBillRepository);
