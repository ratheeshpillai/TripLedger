import assert from "node:assert/strict";
import test from "node:test";
import { applyBillingDefaults, createEmptyBillDraft, DEFAULT_SETTINGS } from "../src/constants/defaults.ts";
import { localStorageSettingsService } from "../src/services/settingsService.ts";

const savedDefaults = {
  ...DEFAULT_SETTINGS,
  defaultDriverName: "Ravi",
  defaultVehicleModel: "Innova Crysta",
  defaultVehicleNumber: "KL 01 AB 1234"
};

test("new bills receive saved driver and vehicle defaults", () => {
  const draft = createEmptyBillDraft(savedDefaults);
  assert.equal(draft.driverName, savedDefaults.defaultDriverName);
  assert.equal(draft.vehicleName, savedDefaults.defaultVehicleModel);
  assert.equal(draft.vehicleNumber, savedDefaults.defaultVehicleNumber);
});

test("current, restored, edit, and duplicate values take priority over defaults", () => {
  const current = {
    ...createEmptyBillDraft(DEFAULT_SETTINGS),
    driverName: "Current Driver",
    vehicleName: "Current Vehicle",
    vehicleNumber: "CURRENT-123"
  };
  const result = applyBillingDefaults(current, savedDefaults);
  assert.equal(result.driverName, current.driverName);
  assert.equal(result.vehicleName, current.vehicleName);
  assert.equal(result.vehicleNumber, current.vehicleNumber);
  assert.deepEqual(savedDefaults, {
    ...DEFAULT_SETTINGS,
    defaultDriverName: "Ravi",
    defaultVehicleModel: "Innova Crysta",
    defaultVehicleNumber: "KL 01 AB 1234"
  });
});

test("empty fields are filled without replacing values already entered", () => {
  const draft = {
    ...createEmptyBillDraft(DEFAULT_SETTINGS),
    driverName: "",
    vehicleName: "Session Vehicle",
    vehicleNumber: ""
  };
  const result = applyBillingDefaults(draft, savedDefaults);
  assert.equal(result.driverName, savedDefaults.defaultDriverName);
  assert.equal(result.vehicleName, "Session Vehicle");
  assert.equal(result.vehicleNumber, savedDefaults.defaultVehicleNumber);
});

test("settings persistence is user-scoped and trims saved defaults", async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    }
  });

  await localStorageSettingsService.saveSettings("user-1", {
    ...savedDefaults,
    defaultDriverName: "  Ravi  ",
    defaultVehicleModel: "  Innova Crysta  ",
    defaultVehicleNumber: "  KL 01 AB 1234  "
  });
  const loaded = await localStorageSettingsService.getSettings("user-1");
  const otherUser = await localStorageSettingsService.getSettings("user-2");

  assert.equal(loaded.defaultDriverName, "Ravi");
  assert.equal(loaded.defaultVehicleModel, "Innova Crysta");
  assert.equal(loaded.defaultVehicleNumber, "KL 01 AB 1234");
  assert.equal(otherUser.defaultDriverName, "");
});
