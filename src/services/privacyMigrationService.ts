const LEGACY_BILLS_KEY = "tripledger.bills.v1";

export function clearLegacyLocalBillData(): void {
  localStorage.removeItem(LEGACY_BILLS_KEY);
}
