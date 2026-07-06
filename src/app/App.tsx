import { useState } from "react";
import { AuthPage } from "../components/auth/AuthPage";
import { AppShell, type AppPage } from "../components/layout/AppShell";
import { LoggerPage } from "../components/logger/LoggerPage";
import { HistoryPage } from "../components/history/HistoryPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { Toast } from "../components/shared/Toast";
import { useAuth } from "../hooks/useAuth";
import { useBillForm } from "../hooks/useBillForm";
import { useBills } from "../hooks/useBills";
import { useSettings } from "../hooks/useSettings";
import { exportSingleBillPdf } from "../utils/pdf";

export default function App() {
  const auth = useAuth();
  const { settings, saveSettings } = useSettings();
  const billsApi = useBills(auth.user?.id ?? null);
  const form = useBillForm(settings);
  const [page, setPage] = useState<AppPage>("logger");
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    showToast("Bill text copied");
  }

  async function handleSave() {
    try {
      const saved = await billsApi.saveBill(form.draft, form.editingBillId);
      form.setEditingBillId(null);
      showToast(form.editingBillId ? "Bill updated" : "Bill saved");
      return saved;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save bill");
      throw error;
    }
  }

  function handleReset() {
    if (confirm("Reset logger and clear all form fields?")) {
      form.resetLogger();
      showToast("Logger reset");
    }
  }

  async function handleLogout() {
    try {
      await auth.logout();
      setPage("logger");
      showToast("Logged out");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to logout");
    }
  }

  if (auth.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-soft">Loading TripLedger...</div>
      </main>
    );
  }

  if (!auth.user) {
    return (
      <AuthPage
        authError={auth.error}
        onLogin={async (email, password) => {
          await auth.login(email, password);
          showToast("Logged in");
        }}
        onSignup={async (email, password) => {
          await auth.signup(email, password);
          showToast("Account created");
        }}
      />
    );
  }

  return (
    <AppShell page={page} setPage={setPage} userEmail={auth.user.email} onLogout={() => void handleLogout()}>
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
            try {
              await billsApi.deleteBill(id);
              showToast("Bill deleted");
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Unable to delete bill");
            }
          }}
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

      <Toast message={toast || billsApi.error} />
    </AppShell>
  );
}
