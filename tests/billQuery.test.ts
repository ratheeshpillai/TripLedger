import assert from "node:assert/strict";
import test from "node:test";
import type { BillRepository } from "../src/repositories/billRepository.ts";
import { createBillService } from "../src/services/billService.ts";
import type { BillQuery } from "../src/types/bill.ts";
import type { OrganizationScope } from "../src/types/organization.ts";

test("bill service preserves explicit paging and filter contracts", async () => {
  const scope: OrganizationScope = { organizationId: "org-1", userId: "user-1", businessType: "individual_driver", role: "owner" };
  const query: BillQuery = { page: 3, pageSize: 20, search: "airport", dateFrom: "2026-08-01", billingPartyId: "party-1", sort: "highest" };
  let received: [OrganizationScope, BillQuery] | undefined;
  const repository = {
    async queryBills(nextScope, nextQuery) {
      received = [nextScope, nextQuery];
      return { items: [], totalCount: 0, totalAmount: 0 };
    }
  } as Pick<BillRepository, "queryBills"> as BillRepository;

  await createBillService(repository).queryBills(scope, query);
  assert.deepEqual(received, [scope, query]);
});
