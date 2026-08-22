import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const historyResultsSource = readFileSync(new URL("../src/components/history/HistoryResults.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../src/components/dashboard/DashboardPage.tsx", import.meta.url), "utf8");
const settingsSource = readFileSync(new URL("../src/components/settings/SettingsPage.tsx", import.meta.url), "utf8");
const selectSource = readFileSync(new URL("../src/components/ui/Select.tsx", import.meta.url), "utf8");
const toastSource = readFileSync(new URL("../src/components/shared/Toast.tsx", import.meta.url), "utf8");

test("validation reserves one compact line without truncating and permits wrapping", () => {
  const rule = styles.match(/\.field-validation-message\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(rule, /min-height:\s*1\.125rem;/);
  assert.match(rule, /overflow-wrap:\s*anywhere;/);
  assert.match(rule, /white-space:\s*normal;/);
  assert.doesNotMatch(rule, /text-overflow|ellipsis|overflow:\s*hidden/);
  assert.doesNotMatch(styles, /\.field-validation-message\s*\{[\s\S]*?min-height:\s*2rem;/);
});

test("History selection is painted by the complete outer desktop row and mobile card", () => {
  assert.match(styles, /\.historyBillTableRow\.is-selected\s*\{[\s\S]*?border-color:[\s\S]*?background:/);
  assert.doesNotMatch(styles, /\.historyBillTableRow\.is-selected td\s*\{/);
  assert.match(styles, /\.historyBillTable tbody td\s*\{[\s\S]*?background:\s*transparent;/);
  assert.match(historyResultsSource, /tripledgerListMobileRow tripledgerListMobileRowContent[\s\S]*?is-selected/);
});

test("dashboard summary and activity use one responsive layout without narrow-screen collisions", () => {
  assert.doesNotMatch(dashboardSource, /useIsMobile/);
  assert.match(dashboardSource, /grid-cols-2[\s\S]*?lg:grid-cols-\[1\.2fr_repeat\(3,minmax\(0,1fr\)\)\]/);
  assert.match(dashboardSource, /h-\[5\.25rem\][\s\S]*?lg:h-auto/);
  assert.match(dashboardSource, /col-start-2 row-start-2/);
  assert.doesNotMatch(dashboardSource, /col-span-2 row-start-2/);
  assert.match(dashboardSource, /hidden gap-2 lg:flex/);
  assert.doesNotMatch(dashboardSource, /col-span-2 flex min-w-0/);
  assert.match(dashboardSource, /sm:grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(dashboardSource, /col-start-2[\s\S]*?sm:col-start-auto/);
});

test("settings preferences share one responsive grid and matching subsection frame", () => {
  assert.equal((settingsSource.match(/rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900\/40 sm:p-5/g) ?? []).length, 2);
  assert.equal((settingsSource.match(/mt-4 form-grid/g) ?? []).length, 2);
  assert.match(settingsSource, /max-w-6xl/);
  assert.match(settingsSource, /flex justify-end[\s\S]*?w-full sm:w-auto/);
  assert.match(selectSource, /box-border block min-h-11 min-w-0 w-full max-w-full/);
  assert.match(styles, /\.field-label\s*\{[\s\S]*?content-start/);
});

test("one central notification list switches between mobile and stacked desktop placement", () => {
  assert.match(toastSource, /notifications\.slice\(-1\)/);
  assert.match(toastSource, /right-6 top-24/);
  assert.match(toastSource, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+10rem\)\]/);
  assert.match(toastSource, /visible\.map\(\(notification\)/);
  assert.equal((toastSource.match(/createPortal\(/g) ?? []).length, 1);
});
