import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseDecimalInput } from "../src/utils/decimalInput.ts";

test("decimal input parsing preserves valid decimals and rejects non-numeric text", () => {
  assert.equal(parseDecimalInput("800.50"), 800.5);
  assert.equal(parseDecimalInput(""), 0);
  assert.equal(Number.isNaN(parseDecimalInput("800x")), true);
});

test("the shared decimal control avoids browser wheel stepping", () => {
  const source = readFileSync(new URL("../src/components/ui/DecimalInput.tsx", import.meta.url), "utf8");
  assert.match(source, /type="text"/);
  assert.match(source, /inputMode="decimal"/);
  assert.doesNotMatch(source, /type="number"/);
});
