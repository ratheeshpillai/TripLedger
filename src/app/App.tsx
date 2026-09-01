import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthPage } from "../components/auth/AuthPage";
import { AuthCallbackPage } from "../components/auth/AuthCallbackPage";
import { ResetPasswordPage } from "../components/auth/ResetPasswordPage";
import { ExtraLoginVerificationPage } from "../components/auth/ExtraLoginVerificationPage";
import { AppShell, type AppPage } from "../components/layout/AppShell";
import { DashboardPage } from "../components/dashboard/DashboardPage";
import { LoggerPage, type SaveBillResult } from "../components/logger/LoggerPage";
import { HistoryPage } from "../components/history/HistoryPage";
import { OwnerCompanyPage } from "../components/owners/OwnerCompanyPage";
import { DriversPage } from "../components/drivers/DriversPage";
import { DriverInvitationPage } from "../components/drivers/DriverInvitationPage";
import { canManageDrivers } from "../components/drivers/driverPageModel";
import { VehiclesPage } from "../components/vehicles/VehiclesPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { ConfirmationDialog } from "../components/shared/ConfirmationDialog";
import { Toast, type ToastNotification, type ToastTone } from "../components/shared/Toast";
import { useAuth } from "../hooks/useAuth";
import { useBillForm } from "../hooks/useBillForm";
import { useBills } from "../hooks/useBills";
import { useBillingParties } from "../hooks/useBillingParties";
import { useDarkMode } from "../hooks/useDarkMode";
import { useDashboard } from "../hooks/useDashboard";
import { useSettings } from "../hooks/useSettings";
import { useOwnerPayments } from "../hooks/useOwnerPayments";
import { useOrganization } from "../hooks/useOrganization";
import { useDrivers } from "../hooks/useDrivers";
import { useDriverInvitations } from "../hooks/useDriverInvitations";
import { useDriverVehicleAssignments } from "../hooks/useDriverVehicleAssignments";
import { useVehicles } from "../hooks/useVehicles";
import { clearLegacyLocalBillData } from "../services/privacyMigrationService";
import { DuplicateBillError, getSafeErrorMessage, logDevError } from "../utils/errors";
import { appServices } from "./appDependencies";

function pageFromPath(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/history") return "history";
  if (normalized === "/owners" || normalized === "/owner-company") return "owners";
  if (normalized === "/drivers") return "drivers";
  if (normalized === "/vehicles") return "vehicles";
  if (normalized === "/logger" || normalized === "/create-bill") return "logger";
  if (normalized === "/settings" || normalized === "/more") return "settings";
  return "dashboard";
}

function pagePath(page: AppPage): string {
  if (page === "history") return "/history";
  if (page === "owners") return "/owners";
  if (page === "drivers") return "/drivers";
  if (page === "vehicles") return "/vehicles";
  if (page === "logger") return "/create-bill";
  if (page === "settings") return "/more";
  return "/dashboard";
}

function authPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function invitationToken(): string {
  if (authPath(window.location.pathname) !== "/driver-invitation") return "";
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

function invitationReturnPath(value = `${window.location.pathname}${window.location.search}`): string | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || authPath(url.pathname) !== "/driver-invitation") return null;
    const token = url.searchParams.get("token") ?? "";
    return /^[a-f0-9]{64}$/i.test(token) ? `${url.pathname}?token=${token}` : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [page, setPage] = useState<AppPage>(() => pageFromPath(window.location.pathname));
  const auth = useAuth();
  const theme = useDarkMode();
  const organization = useOrganization(auth.user?.id ?? null);
  const isFleetOwner = organization.scope?.businessType === "vendor";
  const canManageFleetResources = organization.scope ? canManageDrivers(organization.scope.businessType, organization.scope.role) : false;
  const { settings, saveSettings } = useSettings(auth.user?.id ?? null);
  const billsApi = useBills(organization.scope);
  const billingPartiesEnabled = page === "logger" || page === "history" || page === "owners";
  const billingPartiesApi = useBillingParties(billingPartiesEnabled ? organization.scope : null, page === "owners");
  const ownerPaymentsApi = useOwnerPayments(organization.scope);
  const dashboardApi = useDashboard(organization.scope, page === "dashboard");
  const fleetBillEnabled = isFleetOwner && page === "logger";
  const driversApi = useDrivers(organization.scope, fleetBillEnabled || (page === "drivers" || page === "vehicles") && canManageFleetResources);
  const driverInvitationsApi = useDriverInvitations(organization.scope, page === "drivers" && canManageFleetResources);
  const vehiclesApi = useVehicles(organization.scope, fleetBillEnabled || page === "vehicles" && canManageFleetResources);
  const driverVehicleAssignmentsApi = useDriverVehicleAssignments(organization.scope, fleetBillEnabled || page === "vehicles" && canManageFleetResources);
  const form = useBillForm(settings);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [cancelLoggerConfirmOpen, setCancelLoggerConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileOwnerHeader, setMobileOwnerHeader] = useState<{ title: string; onBack: () => void } | null>(null);
  const [dashboardOwnerId, setDashboardOwnerId] = useState<string | null>(null);
  const [authCallbackHandled, setAuthCallbackHandled] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);
  const nextToastIdRef = useRef(0);
  const lastBillErrorToastRef = useRef("");
  const saveActionPromiseRef = useRef<Promise<SaveBillResult> | null>(null);

  useLayoutEffect(() => {
    const nextUserId = auth.user?.id ?? null;
    if (previousUserIdRef.current !== nextUserId) {
      const currentPath = authPath(window.location.pathname);
      if (nextUserId) clearLegacyLocalBillData();
      form.resetLogger();
      billsApi.clearSelection();
      setNotifications([]);
      if (currentPath !== "/auth/callback" && currentPath !== "/reset-password" && currentPath !== "/driver-invitation") {
        navigateToPage("dashboard", true);
      }
      previousUserIdRef.current = nextUserId;
    }
  }, [auth.user?.id]);

  useLayoutEffect(() => {
    function syncPageFromHistory() {
      const nextPage = pageFromPath(window.location.pathname);
      if (nextPage !== "owners") setDashboardOwnerId(null);
      setPage(nextPage);
    }

    window.addEventListener("popstate", syncPageFromHistory);
    return () => window.removeEventListener("popstate", syncPageFromHistory);
  }, []);

  useLayoutEffect(() => {
    if ((page === "drivers" || page === "vehicles") && organization.scope && !canManageFleetResources) {
      navigateToPage("dashboard", true);
    }
  }, [page, organization.scope?.organizationId, canManageFleetResources]);

  function navigateToPage(nextPage: AppPage, replace = false) {
    const nextPath = pagePath(nextPage);
    if (window.location.pathname !== nextPath) {
      if (replace) window.history.replaceState({}, "", nextPath);
      else window.history.pushState({}, "", nextPath);
    }
    if (nextPage !== "owners") setDashboardOwnerId(null);
    setPage(nextPage);
  }

  function dismissToast(id: number) {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }

  function showToast(message: string, tone: ToastTone = "info") {
    const id = ++nextToastIdRef.current;
    setNotifications((current) => current.some((notification) => notification.message === message)
      ? current
      : [...current, { id, message, tone }].slice(-4));
    window.setTimeout(() => dismissToast(id), tone === "error" ? 4500 : tone === "warning" ? 3000 : 1800);
  }

  useEffect(() => {
    if (billsApi.error && billsApi.error !== lastBillErrorToastRef.current) {
      lastBillErrorToastRef.current = billsApi.error;
      showToast(billsApi.error, "error");
    }
    if (!billsApi.error) lastBillErrorToastRef.current = "";
  }, [billsApi.error]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    showToast("Bill text copied");
  }

  async function handleSave(): Promise<SaveBillResult> {
    if (saveActionPromiseRef.current) return saveActionPromiseRef.current;
    const actionUserId = auth.user?.id ?? null;
    const savePromise = (async () => {
      if (!form.draft.billingPartyId) {
        showToast("Select an Owner / Company before saving.", "warning");
        throw new Error("Owner / Company is required.");
      }
      const wasEditing = Boolean(form.editingBillId);
      const saved = await billsApi.saveBill(form.draft, form.editingBillId);
      const result = { bill: saved, outcome: wasEditing ? "updated" : "created" } as const;
      if (previousUserIdRef.current !== actionUserId) return result;
      form.setEditingBillId(saved.id);
      showToast(wasEditing ? "Bill updated" : "Bill saved", "success");
      void billingPartiesApi.refresh();
      return result;
    })();

    saveActionPromiseRef.current = savePromise;
    try {
      return await savePromise;
    } catch (error) {
      logDevError("Save bill action failed", error);
      if (error instanceof DuplicateBillError && previousUserIdRef.current === actionUserId) {
        form.loadForEdit(error.existingBill);
        showToast("A matching bill already exists. Opened it for editing.", "warning");
        return { bill: error.existingBill, outcome: "duplicate" };
      }
      if (previousUserIdRef.current === actionUserId) {
        showToast(getSafeErrorMessage(error, form.editingBillId ? "bill.update" : "bill.save"), "error");
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
      showToast(getSafeErrorMessage(error, "auth.logout"), "error");
    }
  }

  if (auth.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-[#0b1120]">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:shadow-black/20">Loading TripLoggy...</div>
      </main>
    );
  }

  const currentAuthPath = authPath(window.location.pathname);
  const isAuthCallback = currentAuthPath === "/auth/callback" && !authCallbackHandled;
  const isForgotPassword = currentAuthPath === "/forgot-password";
  const isResetPassword = currentAuthPath === "/reset-password";
  const isDriverInvitation = currentAuthPath === "/driver-invitation";
  const currentInvitationPath = invitationReturnPath();

  if (isAuthCallback) {
    return (
      <AuthCallbackPage
        onVerify={auth.completeEmailVerification}
        onContinue={() => {
          const next = invitationReturnPath(new URLSearchParams(window.location.search).get("next") ?? "") ?? "/";
          window.history.replaceState({}, "", next);
          setAuthCallbackHandled(true);
          showToast("Email verified successfully", "success");
        }}
        onReturnToLogin={async () => {
          await auth.logout();
          const next = invitationReturnPath(new URLSearchParams(window.location.search).get("next") ?? "") ?? "/";
          window.history.replaceState({}, "", next);
          setAuthCallbackHandled(true);
        }}
      />
    );
  }

  if (isResetPassword) {
    return (
      <ResetPasswordPage
        recoveryReady={auth.passwordRecoveryReady}
        onCheckRecovery={auth.refreshPasswordRecoveryState}
        onUpdatePassword={auth.updatePassword}
        onBackToLogin={() => {
          window.history.replaceState({}, "", "/");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
        onRequestNewLink={() => {
          window.history.replaceState({}, "", "/forgot-password");
          window.dispatchEvent(new PopStateEvent("popstate"));
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
          showToast("Login verified", "success");
        }}
        onCancel={auth.logout}
      />
    );
  }

  if (!auth.user) {
    return (
      <AuthPage
        authError={auth.error}
        initialMode={isForgotPassword ? "forgot" : "login"}
        onLogin={async (email, password) => {
          const result = await auth.login(email, password);
          if (!result.extraVerificationRequired) showToast("Logged in", "success");
        }}
        onSignup={async (email, password, businessType) => {
          await auth.signup(email, password, businessType, currentInvitationPath ?? undefined);
        }}
        onResendActivation={(email) => auth.resendSignupConfirmation(email, currentInvitationPath ?? undefined)}
        onPasswordReset={auth.sendPasswordReset}
        onRouteChange={(path) => {
          window.history.pushState({}, "", currentInvitationPath && path === "/" ? currentInvitationPath : path);
        }}
        notice={isDriverInvitation ? "Sign in or create an account with the invited email address to continue." : undefined}
      />
    );
  }

  if (isDriverInvitation) {
    return (
      <DriverInvitationPage
        token={invitationToken()}
        userEmail={auth.user.email}
        onLoad={appServices.driverInvitations.getInvitation}
        onAccept={appServices.driverInvitations.acceptInvitation}
        onContinue={() => {
          window.history.replaceState({}, "", "/dashboard");
          setPage("dashboard");
        }}
        onSignOut={async () => {
          await auth.logout();
        }}
      />
    );
  }

  if (organization.loading || !organization.scope) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-[#0b1120]">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:shadow-black/20">
          {organization.error || "Loading TripLoggy..."}
        </div>
      </main>
    );
  }

  return (
    <AppShell
      page={page}
      setPage={navigateToPage}
      userEmail={auth.user.email}
      isDarkMode={theme.isDarkMode}
      canManageDrivers={canManageFleetResources}
      canManageVehicles={canManageFleetResources}
      mobileTitle={page === "logger" && form.editingBillId ? "Edit Bill" : page === "owners" ? mobileOwnerHeader?.title : undefined}
      mobileSubtitle={page === "logger" && form.editingBillId ? "Update trip and billing details" : page === "owners" && mobileOwnerHeader ? "Owner Account" : undefined}
      mobileBack={page === "logger" && form.editingBillId ? () => navigateToPage("history") : page === "owners" ? mobileOwnerHeader?.onBack : page === "drivers" || page === "vehicles" ? () => navigateToPage("settings") : undefined}
      onToggleDarkMode={theme.toggleDarkMode}
      onLogout={() => setLogoutConfirmOpen(true)}
    >
      {page === "dashboard" && (
        <DashboardPage
          data={dashboardApi.data}
          period={dashboardApi.period}
          settings={settings}
          loading={dashboardApi.loading}
          error={dashboardApi.error}
          onPeriodChange={dashboardApi.setPeriod}
          onCreateBill={() => navigateToPage("logger")}
          onRecordPayment={() => {
            navigateToPage("owners");
            showToast("Select an owner, then choose Record Payment", "info");
          }}
          onViewHistory={() => navigateToPage("history")}
          onViewOwners={() => {
            setDashboardOwnerId(null);
            navigateToPage("owners");
          }}
          onOpenOwner={(billingPartyId) => {
            setDashboardOwnerId(billingPartyId);
            navigateToPage("owners");
          }}
          onOpenBill={(billId) => {
            void billsApi.getBill(billId).then((bill) => {
              form.loadForEdit(bill);
              navigateToPage("logger");
              showToast("Bill loaded for edit");
            }).catch((error) => {
              logDevError("Dashboard bill load failed", error);
              showToast(getSafeErrorMessage(error, "bill.load"), "error");
            });
          }}
          onRetry={() => {
            void dashboardApi.refresh();
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
          isFleetOwner={isFleetOwner}
          drivers={driversApi.drivers}
          vehicles={vehiclesApi.vehicles}
          assignments={driverVehicleAssignmentsApi.assignments}
          fleetResourcesLoading={driversApi.loading || vehiclesApi.loading || driverVehicleAssignmentsApi.loading}
          fleetResourcesError={[driversApi.error, vehiclesApi.error, driverVehicleAssignmentsApi.error].filter(Boolean).join(" ")}
          onFieldChange={form.updateField}
          onGarageTimeChange={form.setGarageTime}
          onSave={handleSave}
          onCreateNew={() => {
            form.resetLogger();
            showToast("New bill ready");
          }}
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
          totalCount={billsApi.totalCount}
          totalAmount={billsApi.totalAmount}
          selectedBills={billsApi.selectedBills}
          selectedQueryKey={billsApi.selectedQueryKey}
          loading={billsApi.loading}
          billingParties={billingPartiesApi.parties}
          settings={settings}
          userId={auth.user.id}
          selectedIds={billsApi.selectedIds}
          onToggleSelected={billsApi.toggleSelected}
          onSelectAll={billsApi.selectAll}
          onQuery={billsApi.queryBills}
          onClearSelection={billsApi.clearSelection}
          onEdit={(bill) => {
            form.loadForEdit(bill);
            navigateToPage("logger");
            showToast("Bill loaded for edit");
          }}
          onDuplicate={(bill) => {
            form.duplicateBill(bill, isFleetOwner);
            navigateToPage("logger");
            showToast("Similar bill ready");
          }}
          onDelete={async (id) => {
            const actionUserId = auth.user?.id ?? null;
            try {
              await billsApi.deleteBill(id);
              if (previousUserIdRef.current === actionUserId) showToast("Bill deleted", "success");
            } catch (error) {
              logDevError("Delete bill action failed", error);
              if (previousUserIdRef.current === actionUserId) showToast(getSafeErrorMessage(error, "bill.delete"), "error");
              throw error;
            }
          }}
          onDeleteSelected={async (ids) => {
            const actionUserId = auth.user?.id ?? null;
            try {
              await billsApi.deleteBills(ids);
              if (previousUserIdRef.current === actionUserId) showToast(ids.length === 1 ? "Bill deleted" : `${ids.length} bills deleted`, "success");
            } catch (error) {
              logDevError("Delete selected bills action failed", error);
              if (previousUserIdRef.current === actionUserId) showToast(getSafeErrorMessage(error, "bill.delete"), "error");
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
          initialSelectedId={dashboardOwnerId}
          onLoadLedger={billingPartiesApi.loadLedger}
          onLoadPayments={ownerPaymentsApi.refresh}
          onLoadStatement={billingPartiesApi.loadStatement}
          onCopy={copyText}
          onSaveParty={async (draft, editingId) => {
            try {
              const saved = await billingPartiesApi.saveBillingParty(draft, editingId);
              showToast(editingId ? "Owner / Company updated" : "Owner / Company added", "success");
              return saved;
            } catch (error) {
              showToast(getSafeErrorMessage(error, editingId ? "owner.update" : "owner.save"), "error");
              throw error;
            }
          }}
          onDeleteParty={async (id) => {
            try {
              await billingPartiesApi.deleteBillingParty(id);
              if (form.draft.billingPartyId === id) form.updateField("billingPartyId", undefined);
              showToast("Owner / Company deleted", "success");
            } catch (error) {
              showToast(getSafeErrorMessage(error, "owner.delete"), "error");
              throw error;
            }
          }}
          onSavePayment={async (draft, editingId) => {
            try {
              const saved = await ownerPaymentsApi.saveOwnerPayment(draft, editingId);
              void billingPartiesApi.refresh();
              showToast(editingId ? "Payment updated" : "Payment recorded", "success");
              return saved;
            } catch (error) {
              showToast(getSafeErrorMessage(error, editingId ? "payment.update" : "payment.save"), "error");
              throw error;
            }
          }}
          onDeletePayment={async (id) => {
            try {
              await ownerPaymentsApi.deleteOwnerPayment(id);
              await billingPartiesApi.refresh();
              showToast("Payment deleted", "success");
            } catch (error) {
              showToast(getSafeErrorMessage(error, "payment.delete"), "error");
              throw error;
            }
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

      {page === "drivers" && canManageFleetResources && (
        <DriversPage
          drivers={driversApi.drivers}
          canManage={canManageDrivers(organization.scope.businessType, organization.scope.role)}
          loading={driversApi.loading || driverInvitationsApi.loading}
          error={[driversApi.error, driverInvitationsApi.error].filter(Boolean).join(" ")}
          savingId={driversApi.savingId}
          invitations={driverInvitationsApi.invitations}
          invitationSavingId={driverInvitationsApi.savingId}
          onSave={async (draft, id) => {
            try {
              const saved = await driversApi.saveDriver(draft, id);
              showToast(id ? "Driver updated" : "Driver added", "success");
              return saved;
            } catch (error) {
              logDevError("Driver save action failed", error);
              showToast(getSafeErrorMessage(error, id ? "driver.update" : "driver.save"), "error");
              throw error;
            }
          }}
          onStatusChange={async (driver, status) => {
            try {
              const saved = await driversApi.setDriverStatus(driver, status);
              showToast(status === "active" ? "Driver activated" : "Driver marked inactive", "success");
              return saved;
            } catch (error) {
              logDevError("Driver status action failed", error);
              showToast(getSafeErrorMessage(error, "driver.update"), "error");
              throw error;
            }
          }}
          onInvite={async (driver, email) => {
            try {
              const invitation = await driverInvitationsApi.createInvitation(driver.id, email);
              const link = new URL("/driver-invitation", window.location.origin);
              link.searchParams.set("token", invitation.token);
              showToast("Driver invitation created", "success");
              return link.toString();
            } catch (error) {
              logDevError("Driver invitation action failed", error);
              showToast(getSafeErrorMessage(error, "invitation.create"), "error");
              throw error;
            }
          }}
          onCancelInvitation={async (invitation) => {
            try {
              await driverInvitationsApi.cancelInvitation(invitation.id);
              showToast("Driver invitation cancelled", "success");
            } catch (error) {
              logDevError("Driver invitation cancellation failed", error);
              showToast(getSafeErrorMessage(error, "invitation.cancel"), "error");
              throw error;
            }
          }}
        />
      )}

      {page === "vehicles" && canManageFleetResources && (
        <VehiclesPage
          vehicles={vehiclesApi.vehicles}
          drivers={driversApi.drivers}
          assignments={driverVehicleAssignmentsApi.assignments}
          canManage={canManageFleetResources}
          loading={vehiclesApi.loading || driversApi.loading || driverVehicleAssignmentsApi.loading}
          error={[vehiclesApi.error, driversApi.error, driverVehicleAssignmentsApi.error].filter(Boolean).join(" ")}
          savingId={vehiclesApi.savingId}
          assignmentSavingVehicleId={driverVehicleAssignmentsApi.savingVehicleId}
          onSave={async (draft, id) => {
            try {
              const saved = await vehiclesApi.saveVehicle(draft, id);
              showToast(id ? "Vehicle updated" : "Vehicle added", "success");
              return saved;
            } catch (error) {
              logDevError("Vehicle save action failed", error);
              showToast(getSafeErrorMessage(error, id ? "vehicle.update" : "vehicle.save"), "error");
              throw error;
            }
          }}
          onStatusChange={async (vehicle, status) => {
            try {
              const saved = await vehiclesApi.setVehicleStatus(vehicle, status);
              showToast(status === "active" ? "Vehicle activated" : "Vehicle marked inactive", "success");
              return saved;
            } catch (error) {
              logDevError("Vehicle status action failed", error);
              showToast(getSafeErrorMessage(error, "vehicle.update"), "error");
              throw error;
            }
          }}
          onAssignDriver={async (vehicleId, driverId) => {
            try {
              const saved = await driverVehicleAssignmentsApi.assignDriver(vehicleId, driverId);
              showToast("Driver assignment updated", "success");
              return saved;
            } catch (error) {
              logDevError("Driver assignment action failed", error);
              showToast(getSafeErrorMessage(error, "assignment.save"), "error");
              throw error;
            }
          }}
          onEndAssignment={async (vehicleId) => {
            try {
              const saved = await driverVehicleAssignmentsApi.endAssignment(vehicleId);
              showToast("Driver assignment ended", "success");
              return saved;
            } catch (error) {
              logDevError("Driver assignment end action failed", error);
              showToast(getSafeErrorMessage(error, "assignment.end"), "error");
              throw error;
            }
          }}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          settings={settings}
          userEmail={auth.user.email}
          isDarkMode={theme.isDarkMode}
          onToggleDarkMode={theme.toggleDarkMode}
          onLogout={() => setLogoutConfirmOpen(true)}
          onOpenDrivers={canManageFleetResources ? () => navigateToPage("drivers") : undefined}
          onOpenVehicles={canManageFleetResources ? () => navigateToPage("vehicles") : undefined}
          onSave={async (next) => {
            try {
              const saved = await saveSettings(next);
              showToast("Settings saved successfully.", "success");
              return saved;
            } catch (error) {
              logDevError("Settings save failed", error);
              showToast(getSafeErrorMessage(error, "settings.save"), "error");
              throw error;
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

      <Toast notifications={notifications} onDismiss={dismissToast} />
    </AppShell>
  );
}
