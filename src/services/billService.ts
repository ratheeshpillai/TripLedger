import type { Bill } from "../types/bill";

export interface BillService {
  listBills(): Promise<Bill[]>;
  saveBill(bill: Bill): Promise<Bill>;
  updateBill(bill: Bill): Promise<Bill>;
  deleteBill(id: string): Promise<void>;
  clearBills(): Promise<void>;
}
