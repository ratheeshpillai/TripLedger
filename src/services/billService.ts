import type { Bill, BillQuery, PagedBills } from "../types/bill";
import type { BillRepository } from "../repositories/billRepository";
import type { OrganizationScope } from "../types/organization";
import { BillValidationError, normalizeBillDraft, validateBillDraft } from "../utils/billValidation";

export interface BillService {
  queryBills(scope: OrganizationScope, query: BillQuery): Promise<PagedBills>;
  getBill(scope: OrganizationScope, id: string): Promise<Bill>;
  saveBill(scope: OrganizationScope, bill: Bill, requestId: string): Promise<Bill>;
  updateBill(scope: OrganizationScope, bill: Bill): Promise<Bill>;
  deleteBill(scope: OrganizationScope, id: string): Promise<void>;
  deleteBills(scope: OrganizationScope, ids: string[]): Promise<void>;
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
    queryBills(scope, query) {
      return repository.queryBills(scope, query);
    },
    getBill(scope, id) {
      return repository.getBill(scope, id);
    },
    saveBill(scope, bill, requestId) {
      return repository.saveBill(scope, validBill(bill), requestId);
    },
    updateBill(scope, bill) {
      return repository.updateBill(scope, validBill(bill));
    },
    deleteBill(scope, id) {
      return repository.deleteBill(scope, id);
    },
    deleteBills(scope, ids) {
      return repository.deleteBills(scope, ids);
    }
  };
}
