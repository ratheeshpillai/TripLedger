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
  async listBills() {
    return readBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async saveBill(_userId, bill) {
    const bills = readBills();
    writeBills([bill, ...bills]);
    return bill;
  },
  async updateBill(_userId, bill) {
    const bills = readBills();
    writeBills(bills.map((item) => (item.id === bill.id ? bill : item)));
    return bill;
  },
  async deleteBill(_userId, id) {
    writeBills(readBills().filter((bill) => bill.id !== id));
  }
};
