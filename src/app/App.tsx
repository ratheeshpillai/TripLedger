import { useLayoutEffect, useRef, useState } from "react";
import { AuthPage } from "../components/auth/AuthPage";
import { AuthCallbackPage } from "../components/auth/AuthCallbackPage";
import { ExtraLoginVerificationPage } from "../components/auth/ExtraLoginVerificationPage";
import { AppShell, type AppPage } from "../components/layout/AppShell";
import { DashboardPage } from "../components/dashboard/DashboardPage";
import { LoggerPage } from "../components/logger/LoggerPage";
import { HistoryPage } from "../components/history/HistoryPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { ConfirmationDialog } from "../components/shared/ConfirmationDialog";
import { Toast } from "../components/shared/Toast";
import { useAuth } from "../hooks/useAuth";
import { useBillForm } from "../hooks/useBillForm";
import { useBills } from "../hooks/useBills";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSettings } from "../hooks/useSettings";
import { getErrorMessage, logDevError } from "../utils/errors";
import { exportSingleBillPdf } from "../utils/pdf";

function pageFromPath(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/history") return "history";
  if (normalized === "/logger" || normalized === "/create-bill") return "logger";
  if (normalized === "/settings") return "settings";
  return "dashboard";
}

function pagePath(page: AppPage): string {
  if (page === "history") return "/history";
  if (page === "logger") return "/create-bill";
  if (page === "settings") return "/settings";
  return "/dashboard";
}

export default function App() {
  const auth = useAuth();
  const theme = useDarkMode();
  const { settings, saveSettings } = useSettings();
  const billsApi = useBills(auth.user?.id ?? null);
  const form = useBillForm(settings);
  const [page, setPage] = useState<AppPage>(() => pageFromPath(window.location.pathname));
  const [toast, setToast] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [authCallbackHandled, setAuthCallbackHandled] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const nextUserId = auth.user?.id ?? null;
    if (previousUserIdRef.current !== nextUserId) {
      form.resetLogger();
      billsApi.clearSelection();
      navigateToPage("dashboard", true);
      previousUserIdRef.current = nextUserId;
    }
  }, [auth.user?.id]);

  useLayoutEffect(() => {
    function syncPageFromHistory() {
      setPage(pageFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", syncPageFromHistory);
    return () => window.removeEventListener("popstate", syncPageFromHistory);
  }, []);

  function navigateToPage(nextPage: AppPage, replace = false) {
    const nextPath = pagePath(nextPage);
    if (window.location.pathname !== nextPath) {
      if (replace) window.history.replaceState({}, "", nextPath);
      else window.history.pushState({}, "", nextPath);
    }
    setPage(nextPage);
  }

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
      logDevError("Save bill action failed", error);
      showToast(getErrorMessage(error, "Unable to save bill"));
      throw error;
    }
  }

  function handleReset() {
    setResetConfirmOpen(true);
  }

  function confirmReset() {
    form.resetLogger();
    setResetConfirmOpen(false);
    showToast("Logger reset");
  }

  async function handleLogout() {
    try {
      form.resetLogger();
      billsApi.clearSelection();
      await auth.logout();
      setLogoutConfirmOpen(false);
      navigateToPage("dashboard", true);
      showToast("Logged out");
    } catch (error) {
      logDevError("Logout failed", error);
      showToast(getErrorMessage(error, "Unable to logout"));
    }
  }

  if (auth.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-[#0b1120]">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:shadow-black/20">Loading TripLedger...</div>
      </main>
    );
  }

  const isAuthCallback = window.location.pathname.replace(/\/+$/, "") === "/auth/callback" && !authCallbackHandled;

  if (isAuthCallback) {
    return (
      <AuthCallbackPage
        onVerify={auth.completeEmailVerification}
        onContinue={() => {
          window.history.replaceState({}, "", "/");
          setAuthCallbackHandled(true);
          showToast("Email verified successfully");
        }}
        onReturnToLogin={async () => {
          await auth.logout();
          window.history.replaceState({}, "", "/");
          setAuthCallbackHandled(true);
        }}
      />
    );
  }

  if (auth.extraVerificationRequired) {
    return (
      <ExtraLoginVerificationPage
        email={auth.verificationEmail}
        onVerify={async (code) => {
          await auth.verifyExtraLogin(code);
          showToast("Login verified");
        }}
        onCancel={auth.logout}
      />
    );
  }

  if (!auth.user) {
    return (
      <AuthPage
        authError={auth.error}
        onLogin={async (email, password) => {
          const result = await auth.login(email, password);
          if (!result.extraVerificationRequired) showToast("Logged in");
        }}
        onSignup={async (email, password) => {
          await auth.signup(email, password);
          showToast("Account created");
        }}
      />
    );
  }

  return (
    <AppShell page={page} setPage={navigateToPage} userEmail={auth.user.email} isDarkMode={theme.isDarkMode} onToggleDarkMode={theme.toggleDarkMode} onLogout={() => setLogoutConfirmOpen(true)}>
      {page === "dashboard" && (
        <DashboardPage
          bills={billsApi.bills}
          settings={settings}
          loading={billsApi.loading}
          error={billsApi.error}
          onCreateBill={() => navigateToPage("logger")}
          onViewHistory={() => navigateToPage("history")}
          onOpenBill={(bill) => {
            form.loadForEdit(bill);
            navigateToPage("logger");
            showToast("Bill loaded for edit");
          }}
        />
      )}

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
            navigateToPage("logger");
            showToast("Bill loaded for edit");
          }}
          onDuplicate={(bill) => {
            form.duplicateBill(bill);
            navigateToPage("logger");
            showToast("Similar bill ready");
          }}
          onDelete={async (id) => {
            try {
              await billsApi.deleteBill(id);
              showToast("Bill deleted");
            } catch (error) {
              logDevError("Delete bill action failed", error);
              showToast(getErrorMessage(error, "Unable to delete bill"));
            }
          }}
          onCopy={copyText}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          settings={settings}
          userEmail={auth.user.email}
          isDarkMode={theme.isDarkMode}
          onToggleDarkMode={theme.toggleDarkMode}
          onSave={async (next) => {
            await saveSettings(next);
            showToast("Settings saved");
          }}
        />
      )}

      <ConfirmationDialog
        open={resetConfirmOpen}
        title="Reset Logger?"
        message="Clear all current logger fields and start from a blank bill?"
        confirmLabel="Reset Logger"
        confirmVariant="danger"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={confirmReset}
      />

      <ConfirmationDialog
        open={logoutConfirmOpen}
        title="Log out?"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        confirmVariant="danger"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />

      <Toast message={toast || billsApi.error} />
    </AppShell>
  );
}
