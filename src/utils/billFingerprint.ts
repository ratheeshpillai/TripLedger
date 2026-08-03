import type { Bill } from "../types/bill";

function normalized(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("en");
}

export function sameBillFingerprint(left: Bill, right: Bill): boolean {
  return left.billingPartyId === right.billingPartyId
    && normalized(left.guestSalutation) === normalized(right.guestSalutation)
    && normalized(left.guestName) === normalized(right.guestName)
    && normalized(left.vehicleNumber) === normalized(right.vehicleNumber)
    && normalized(left.reportingPlace) === normalized(right.reportingPlace)
    && normalized(left.tripDate) === normalized(right.tripDate)
    && normalized(left.reportingTime) === normalized(right.reportingTime)
    && normalized(left.closingDate) === normalized(right.closingDate)
    && normalized(left.closingTime) === normalized(right.closingTime);
}
