import { useLayoutEffect, useRef, useState } from "react";
import { AuthPage } from "../components/auth/AuthPage";
import { AuthCallbackPage } from "../components/auth/AuthCallbackPage";
import { ExtraLoginVerificationPage } from "../components/auth/ExtraLoginVerificationPage";
import { AppShell, type AppPage } from "../components/layout/AppShell";
import { DashboardPage } from "../components/dashboard/DashboardPage";
import { LoggerPage } from "../components/logger/LoggerPage";
import { HistoryPage } from "../components/history/HistoryPage";
import { OwnerCompanyPage } from "../components/owners/OwnerCompanyPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { ConfirmationDialog } from "../components/shared/ConfirmationDialog";
import { Toast } from "../components/shared/Toast";
import { useAuth } from "../hooks/useAuth";
import { useBillForm } from "../hooks/useBillForm";
import { useBills } from "../hooks/useBills";
import { useBillingParties } from "../hooks/useBillingParties";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSettings } from "../hooks/useSettings";
import { useOwnerPayments } from "../hooks/useOwnerPayments";
import { clearLegacyLocalBillData } from "../services/privacyMigrationService";
import { getSafeErrorMessage, logDevError } from "../utils/errors";

function pageFromPath(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/history") return "history";
  if (normalized === "/owners" || normalized === "/owner-company") return "owners";
  if (normalized === "/logger" || normalized === "/create-bill") return "logger";
  if (normalized === "/settings" || normalized === "/more") return "settings";
  return "dashboard";
}

function pagePath(page: AppPage): string {
  if (page === "history") return "/history";
  if (page === "owners") return "/owners";
  if (page === "logger") return "/create-bill";
  if (page === "settings") return "/more";
  return "/dashboard";
}

export default function App() {
  const auth = useAuth();
  const theme = useDarkMode();
  const { settings, saveSettings } = useSettings(auth.user?.id ?? null);
  const billsApi = useBills(auth.user?.id ?? null);
  const billingPartiesApi = useBillingParties(auth.user?.id ?? null);
  const ownerPaymentsApi = useOwnerPayments(auth.user?.id ?? null);
  const form = useBillForm(settings);
  const [page, setPage] = useState<AppPage>(() => pageFromPath(window.location.pathname));
  const [toast, setToast] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [cancelLoggerConfirmOpen, setCancelLoggerConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileOwnerHeader, setMobileOwnerHeader] = useState<{ title: string; onBack: () => void } | null>(null);
  const [authCallbackHandled, setAuthCallbackHandled] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);
  const saveActionPromiseRef = useRef<Promise<unknown> | null>(null);

  useLayoutEffect(() => {
    const nextUserId = auth.user?.id ?? null;
    if (previousUserIdRef.current !== nextUserId) {
      if (nextUserId) clearLegacyLocalBillData();
      form.resetLogger();
      billsApi.clearSelection();
      setToast("");
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
    if (saveActionPromiseRef.current) return saveActionPromiseRef.current as Promise<ReturnType<typeof billsApi.saveBill>>;
    const actionUserId = auth.user?.id ?? null;
    const savePromise = (async () => {
      if (!form.draft.billingPartyId) {
        showToast("Select an Owner / Company before saving.");
        throw new Error("Owner / Company is required.");
      }
      const saved = await billsApi.saveBill(form.draft, form.editingBillId);
      if (previousUserIdRef.current !== actionUserId) return saved;
      form.setEditingBillId(null);
      showToast(form.editingBillId ? "Bill updated" : "Bill saved");
      void billingPartiesApi.refresh();
      return saved;
    })();

    saveActionPromiseRef.current = savePromise;
    try {
      return await savePromise;
    } catch (error) {
      logDevError("Save bill action failed", error);
      if (previousUserIdRef.current === actionUserId) {
        showToast(getSafeErrorMessage(error, form.editingBillId ? "bill.update" : "bill.save"));
      }
      throw error;
    } finally {
      if (saveActionPromiseRef.current === savePromise) saveActionPromiseRef.current = null;
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

  function confirmCancelLogger() {
    form.resetLogger();
    setCancelLoggerConfirmOpen(false);
    navigateToPage("dashboard");
    showToast("Bill discarded");
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
      showToast(getSafeErrorMessage(error, "auth.logout"));
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
    <AppShell
      page={page}
      setPage={navigateToPage}
      userEmail={auth.user.email}
      isDarkMode={theme.isDarkMode}
      mobileTitle={page === "logger" && form.editingBillId ? "Edit Bill" : page === "owners" ? mobileOwnerHeader?.title : undefined}
      mobileSubtitle={page === "logger" && form.editingBillId ? "Update trip and billing details" : page === "owners" && mobileOwnerHeader ? "Owner Account" : undefined}
      mobileBack={page === "logger" && form.editingBillId ? () => navigateToPage("history") : page === "owners" ? mobileOwnerHeader?.onBack : undefined}
      onToggleDarkMode={theme.toggleDarkMode}
      onLogout={() => setLogoutConfirmOpen(true)}
    >
      {page === "dashboard" && (
        <DashboardPage
          bills={billsApi.bills}
          billingParties={billingPartiesApi.parties}
          ownerSummaries={billingPartiesApi.summaries}
          ownerPayments={ownerPaymentsApi.payments}
          settings={settings}
          loading={billsApi.loading || billingPartiesApi.loading || ownerPaymentsApi.loading}
          error={billsApi.error || billingPartiesApi.error || ownerPaymentsApi.error}
          onCreateBill={() => navigateToPage("logger")}
          onRecordPayment={() => {
            navigateToPage("owners");
            showToast("Select an owner, then choose Record Payment");
          }}
          onViewHistory={() => navigateToPage("history")}
          onViewOwners={() => navigateToPage("owners")}
          onOpenBill={(bill) => {
            form.loadForEdit(bill);
            navigateToPage("logger");
            showToast("Bill loaded for edit");
          }}
          onRetry={() => {
            void Promise.all([billsApi.refresh(), billingPartiesApi.refresh(), ownerPaymentsApi.refresh()]);
          }}
        />
      )}

      {page === "logger" && (
        <LoggerPage
          draft={form.draft}
          editingBillId={form.editingBillId}
          saving={billsApi.saving}
          settings={settings}
          billingParties={billingPartiesApi.parties}
          onQuickCreateBillingParty={async (name) => {
            const saved = await billingPartiesApi.saveBillingParty({
              userId: auth.user?.id,
              name,
              companyName: "",
              phone: "",
              email: "",
              address: "",
              notes: ""
            });
            form.updateField("billingPartyId", saved.id);
            showToast("Owner / Company created");
            return saved;
          }}
          onFieldChange={form.updateField}
          onGarageTimeChange={form.setGarageTime}
          onSave={handleSave}
          onReset={handleReset}
          onCancel={() => setCancelLoggerConfirmOpen(true)}
          onCopy={copyText}
          onPdf={() => {
            const now = new Date().toISOString();
            const selectedParty = billingPartiesApi.parties.find((party) => party.id === form.draft.billingPartyId);
            void import("../utils/pdf").then(({ exportSingleBillPdf }) => exportSingleBillPdf({
              ...form.draft,
              billingPartyName: selectedParty?.name,
              billingPartyCompanyName: selectedParty?.companyName,
              id: "preview",
              createdAt: now,
              updatedAt: now
            }, settings));
          }}
        />
      )}

      {page === "history" && (
        <HistoryPage
          bills={billsApi.bills}
          billingParties={billingPartiesApi.parties}
          settings={settings}
          userId={auth.user.id}
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
            const actionUserId = auth.user?.id ?? null;
            try {
              await billsApi.deleteBill(id);
              if (previousUserIdRef.current === actionUserId) showToast("Bill deleted");
            } catch (error) {
              logDevError("Delete bill action failed", error);
              if (previousUserIdRef.current === actionUserId) showToast(getSafeErrorMessage(error, "bill.delete"));
              throw error;
            }
          }}
          onDeleteSelected={async (ids) => {
            const actionUserId = auth.user?.id ?? null;
            try {
              await billsApi.deleteBills(ids);
              if (previousUserIdRef.current === actionUserId) showToast(ids.length === 1 ? "Bill deleted" : `${ids.length} bills deleted`);
            } catch (error) {
              logDevError("Delete selected bills action failed", error);
              if (previousUserIdRef.current === actionUserId) showToast(getSafeErrorMessage(error, "bill.delete"));
              throw error;
            }
          }}
          onCopy={copyText}
          onCreateBill={() => navigateToPage("logger")}
        />
      )}

      {page === "owners" && (
        <OwnerCompanyPage
          parties={billingPartiesApi.parties}
          summaries={billingPartiesApi.summaries}
          ledgerByPartyId={billingPartiesApi.ledgerByPartyId}
          payments={ownerPaymentsApi.payments}
          settings={settings}
          loading={billingPartiesApi.loading}
          error={billingPartiesApi.error || ownerPaymentsApi.error}
          partySaving={billingPartiesApi.saving}
          partyDeletingIds={billingPartiesApi.deletingIds}
          paymentSaving={ownerPaymentsApi.saving}
          paymentDeletingIds={ownerPaymentsApi.deletingIds}
          onLoadLedger={billingPartiesApi.loadLedger}
          onLoadStatement={billingPartiesApi.loadStatement}
          onCopy={copyText}
          onSaveParty={billingPartiesApi.saveBillingParty}
          onDeleteParty={async (id) => {
            await billingPartiesApi.deleteBillingParty(id);
            if (form.draft.billingPartyId === id) form.updateField("billingPartyId", undefined);
          }}
          onSavePayment={async (draft, editingId) => {
            const saved = await ownerPaymentsApi.saveOwnerPayment(draft, editingId);
            void billingPartiesApi.refresh();
            return saved;
          }}
          onDeletePayment={async (id) => {
            await ownerPaymentsApi.deleteOwnerPayment(id);
            await billingPartiesApi.refresh();
          }}
          onCreateBillForOwner={(party) => {
            form.resetLogger();
            form.updateField("billingPartyId", party.id);
            navigateToPage("logger");
            showToast("Owner / Company selected");
          }}
          onMobileDetailChange={(party, onBack) => setMobileOwnerHeader(party && onBack ? { title: party.companyName || party.name, onBack } : null)}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          settings={settings}
          userEmail={auth.user.email}
          isDarkMode={theme.isDarkMode}
          onToggleDarkMode={theme.toggleDarkMode}
          onLogout={() => setLogoutConfirmOpen(true)}
          onSave={async (next) => {
            try {
              await saveSettings(next);
              showToast("Settings saved");
            } catch (error) {
              logDevError("Settings save failed", error);
              showToast(getSafeErrorMessage(error, "settings.save"));
            }
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
        open={cancelLoggerConfirmOpen}
        title="Discard bill?"
        message="Leave this bill and discard the current entered details?"
        confirmLabel="Discard Bill"
        confirmVariant="danger"
        onCancel={() => setCancelLoggerConfirmOpen(false)}
        onConfirm={confirmCancelLogger}
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
