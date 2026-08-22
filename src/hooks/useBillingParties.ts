import { useEffect, useMemo, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { BillingPartyService } from "../services/billingPartyService";
import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry } from "../types/billingParty";
import type { OrganizationScope } from "../types/organization";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";

export function useBillingParties(scope: OrganizationScope | null, includeSummaries = true, service: BillingPartyService = appServices.billingParties) {
  const scopeKey = scope ? `${scope.userId}:${scope.organizationId}` : null;
  const [parties, setParties] = useState<BillingParty[]>([]);
  const [summaries, setSummaries] = useState<BillingPartySummary[]>([]);
  const [ledgerByPartyId, setLedgerByPartyId] = useState<Record<string, LedgerEntry[]>>({});
  const [loading, setLoading] = useState(Boolean(scope));
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));
  const savePromiseRef = useRef<Promise<BillingParty> | null>(null);
  const deletePromiseByIdRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setParties([]);
    setSummaries([]);
    setLedgerByPartyId({});
    setError("");
    setLoadedScopeKey(null);
    setSaving(false);
    setDeletingIds([]);
    savePromiseRef.current = null;
    deletePromiseByIdRef.current.clear();
    setLoading(Boolean(scope));
  }, [scopeKey]);

  async function refresh() {
    const requestScope = scope;
    if (!requestScope || !scopeKey || !requestGuardRef.current.isOwnerActive(scopeKey)) return;

    const requestTicket = requestGuardRef.current.begin(scopeKey);
    const isCurrentRequest = () => requestGuardRef.current.isCurrent(requestTicket);

    try {
      setError("");
      setLoading(true);
      const [nextParties, nextSummaries] = await Promise.all([
        service.listBillingParties(requestScope),
        includeSummaries ? service.listBillingPartySummaries(requestScope) : Promise.resolve([])
      ]);
      if (!isCurrentRequest()) return;
      setParties(nextParties);
      setSummaries(nextSummaries);
      setLoadedScopeKey(scopeKey);
    } catch (loadError) {
      if (!isCurrentRequest()) return;
      logDevError("Billing party refresh failed", loadError);
      setError(getSafeErrorMessage(loadError, "unexpected"));
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [scopeKey, includeSummaries]);

  async function loadLedger(billingPartyId: string) {
    if (!scope) return [];
    try {
      const ledger = await service.listBillingPartyLedger(scope, billingPartyId);
      setLedgerByPartyId((current) => ({ ...current, [billingPartyId]: ledger }));
      return ledger;
    } catch (ledgerError) {
      logDevError("Billing party ledger failed", ledgerError);
      setError(getSafeErrorMessage(ledgerError, "unexpected"));
      return [];
    }
  }

  async function loadStatement(billingPartyId: string, fromDate: string, toDate: string): Promise<BillingPartyStatement | null> {
    if (!scope) return null;
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Please select a valid date range.");
      return null;
    }
    try {
      setError("");
      return await service.getBillingPartyStatement(scope, billingPartyId, fromDate, toDate);
    } catch (statementError) {
      logDevError("Billing party statement failed", statementError);
      setError("Unable to load the owner statement.");
      return null;
    }
  }

  async function saveBillingParty(draft: BillingPartyDraft, editingId?: string | null) {
    if (!scope) throw new Error("You must be logged in to save an Owner / Company.");
    if (savePromiseRef.current) return savePromiseRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const existing = editingId ? parties.find((party) => party.id === editingId) : null;
      const saved = existing
        ? await service.updateBillingParty(scope, { ...existing, ...draft, id: editingId!, createdAt: existing.createdAt, updatedAt: existing.updatedAt })
        : await service.saveBillingParty(scope, draft);
      void refresh();
      return saved;
    })();

    savePromiseRef.current = savePromise;
    try {
      return await savePromise;
    } finally {
      if (savePromiseRef.current === savePromise) savePromiseRef.current = null;
      setSaving(false);
    }
  }

  async function deleteBillingParty(id: string) {
    if (!scope) throw new Error("You must be logged in to delete an Owner / Company.");
    const existingDelete = deletePromiseByIdRef.current.get(id);
    if (existingDelete) return existingDelete;

    const deletePromise = (async () => {
      setDeletingIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      await service.deleteBillingParty(scope, id);
      await refresh();
    })();

    deletePromiseByIdRef.current.set(id, deletePromise);
    try {
      await deletePromise;
    } finally {
      deletePromiseByIdRef.current.delete(id);
      setDeletingIds((ids) => ids.filter((item) => item !== id));
    }
  }

  const summaryById = useMemo(() => new Map(summaries.map((summary) => [summary.billingPartyId, summary])), [summaries]);

  return {
    parties,
    summaries,
    summaryById,
    ledgerByPartyId,
    loading: loading || Boolean(scopeKey && loadedScopeKey !== scopeKey),
    saving,
    deletingIds,
    error,
    refresh,
    loadLedger,
    loadStatement,
    saveBillingParty,
    deleteBillingParty
  };
}
