import type { Bill } from "../types/bill";
import type { BillService } from "./billService";

const BILLS_KEY = "tripledger.bills.v1";

function readBills(): Bill[] {
  try {
    return JSON.parse(localStorage.getItem(BILLS_KEY) ?? "[]") as Bill[];
  } catch {
    return [];
  }
}

function writeBills(bills: Bill[]): void {
  localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
}

export const localStorageBillService: BillService = {
  async listBills(userId) {
    return readBills().filter((bill) => bill.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async saveBill(userId, bill) {
    const bills = readBills();
    const nextBill = { ...bill, userId };
    writeBills([nextBill, ...bills]);
    return nextBill;
  },
  async updateBill(userId, bill) {
    const bills = readBills();
    const nextBill = { ...bill, userId };
    writeBills(bills.map((item) => (item.id === bill.id && item.userId === userId ? nextBill : item)));
    return nextBill;
  },
  async deleteBill(userId, id) {
    writeBills(readBills().filter((bill) => !(bill.id === id && bill.userId === userId)));
  }
};
