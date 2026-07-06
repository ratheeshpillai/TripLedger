import type { Bill } from "../types/bill";

export interface BillRepository {
  listBills(userId: string): Promise<Bill[]>;
  saveBill(userId: string, bill: Bill): Promise<Bill>;
  updateBill(userId: string, bill: Bill): Promise<Bill>;
  deleteBill(userId: string, id: string): Promise<void>;
}
