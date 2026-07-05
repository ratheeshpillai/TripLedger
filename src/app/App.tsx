import { useState } from "react";
import { AppShell, type AppPage } from "../components/layout/AppShell";
import { LoggerPage } from "../components/logger/LoggerPage";
import { HistoryPage } from "../components/history/HistoryPage";
import { BillSummaryPage } from "../components/summary/BillSummaryPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { Toast } from "../components/shared/Toast";
import { useBillForm } from "../hooks/useBillForm";
import { useBills } from "../hooks/useBills";
import { useSettings } from "../hooks/useSettings";
import { exportSingleBillPdf } from "../utils/pdf";

export default function App() {
  const { settings, saveSettings } = useSettings();
  const billsApi = useBills();
  const form = useBillForm(settings);
  const [page, setPage] = useState<AppPage>("logger");
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    showToast("Copied");
  }

  async function handleSave() {
    const saved = await billsApi.saveBill(form.draft, form.editingBillId);
    form.setEditingBillId(null);
    showToast(form.editingBillId ? "Bill updated" : "Bill saved");
    return saved;
  }

  function handleReset() {
    if (confirm("Reset logger and clear all form fields?")) {
      form.resetLogger();
      showToast("Logger reset");
    }
  }

  return (
    <AppShell page={page} setPage={setPage} selectedCount={billsApi.selectedIds.length}>
      {page === "logger" && (
        <LoggerPage
          draft={form.draft}
          editingBillId={form.editingBillId}
          settings={settings}
          onFieldChange={form.updateField}
          onGarageTimeChange={form.setGarageTime}
          onSave={handleSave}
          onReset={handleReset}
          onCopy={copyText}
          onPdf={() => {
            const now = new Date().toISOString();
            exportSingleBillPdf({ ...form.draft, id: "preview", createdAt: now, updatedAt: now }, settings);
          }}
        />
      )}

      {page === "history" && (
        <HistoryPage
          bills={billsApi.bills}
          settings={settings}
          selectedIds={billsApi.selectedIds}
          onToggleSelected={billsApi.toggleSelected}
          onSelectAll={billsApi.selectAll}
          onClearSelection={billsApi.clearSelection}
          onEdit={(bill) => {
            form.loadForEdit(bill);
            setPage("logger");
            showToast("Bill loaded for edit");
          }}
          onDuplicate={(bill) => {
            form.duplicateBill(bill);
            setPage("logger");
            showToast("Similar bill ready");
          }}
          onDelete={async (id) => {
            await billsApi.deleteBill(id);
            showToast("Bill deleted");
          }}
          onCopy={copyText}
        />
      )}

      {page === "summary" && (
        <BillSummaryPage
          bills={billsApi.selectedBills.length > 0 ? billsApi.selectedBills : billsApi.bills}
          settings={settings}
          onCopy={copyText}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          settings={settings}
          onSave={async (next) => {
            await saveSettings(next);
            showToast("Settings saved");
          }}
        />
      )}

      <Toast message={toast} />
    </AppShell>
  );
}
