import type { Bill, BillQuery, PagedBills } from "../types/bill";
import type { OrganizationScope } from "../types/organization";

export interface BillRepository {
  queryBills(scope: OrganizationScope, query: BillQuery): Promise<PagedBills>;
  getBill(scope: OrganizationScope, id: string): Promise<Bill>;
  saveBill(scope: OrganizationScope, bill: Bill, requestId: string): Promise<Bill>;
  updateBill(scope: OrganizationScope, bill: Bill): Promise<Bill>;
  deleteBill(scope: OrganizationScope, id: string): Promise<void>;
  deleteBills(scope: OrganizationScope, ids: string[]): Promise<void>;
}
