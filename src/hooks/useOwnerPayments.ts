import { useEffect, useRef, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { OwnerPaymentService } from "../services/ownerPaymentService";
import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";
import type { OrganizationScope } from "../types/organization";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";
import { createRequestId } from "../utils/requestId";

export function useOwnerPayments(scope: OrganizationScope | null, service: OwnerPaymentService = appServices.ownerPayments) {
  const scopeKey = scope ? `${scope.userId}:${scope.organizationId}` : null;
  const [payments, setPayments] = useState<OwnerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(scopeKey));
  const savePromiseRef = useRef<Promise<OwnerPayment> | null>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const deletePromiseByIdRef = useRef(new Map<string, Promise<void>>());
  const billingPartyIdRef = useRef<string | undefined>();

  useEffect(() => {
    requestGuardRef.current.changeOwner(scopeKey);
    setPayments([]);
    setError("");
    setSaving(false);
    setDeletingIds([]);
    savePromiseRef.current = null;
    createRequestIdRef.current = null;
    deletePromiseByIdRef.current.clear();
    billingPartyIdRef.current = undefined;
    setLoading(false);
  }, [scopeKey]);

  async function refresh(billingPartyId?: string) {
    const requestScope = scope;
    if (!requestScope || !scopeKey || !requestGuardRef.current.isOwnerActive(scopeKey)) return;
    billingPartyIdRef.current = billingPartyId;

    const requestTicket = requestGuardRef.current.begin(scopeKey);
    const isCurrentRequest = () => requestGuardRef.current.isCurrent(requestTicket);

    try {
      setError("");
      setLoading(true);
      const saved = await service.listOwnerPayments(requestScope, billingPartyId);
      if (!isCurrentRequest()) return;
      setPayments(saved);
    } catch (loadError) {
      if (!isCurrentRequest()) return;
      logDevError("Owner payment refresh failed", loadError);
      setError(getSafeErrorMessage(loadError, "unexpected"));
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  async function saveOwnerPayment(draft: OwnerPaymentDraft, editingId?: string | null) {
    if (!scope) throw new Error("You must be logged in to save an owner payment.");
    if (savePromiseRef.current) return savePromiseRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const existing = editingId ? payments.find((payment) => payment.id === editingId) : null;
      const saved = existing
        ? await service.updateOwnerPayment(scope, { ...existing, ...draft, id: editingId!, createdAt: existing.createdAt, updatedAt: existing.updatedAt })
        : await (async () => {
          createRequestIdRef.current = createRequestIdRef.current ?? createRequestId();
          const created = await service.saveOwnerPayment(scope, draft, createRequestIdRef.current);
          createRequestIdRef.current = null;
          return created;
        })();
      void refresh(draft.billingPartyId);
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

  async function deleteOwnerPayment(id: string) {
    if (!scope) throw new Error("You must be logged in to delete an owner payment.");
    const existingDelete = deletePromiseByIdRef.current.get(id);
    if (existingDelete) return existingDelete;

    const deletePromise = (async () => {
      setDeletingIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      await service.deleteOwnerPayment(scope, id);
      await refresh(billingPartyIdRef.current);
    })();

    deletePromiseByIdRef.current.set(id, deletePromise);
    try {
      await deletePromise;
    } finally {
      deletePromiseByIdRef.current.delete(id);
      setDeletingIds((ids) => ids.filter((item) => item !== id));
    }
  }

  return {
    payments,
    loading,
    saving,
    deletingIds,
    error,
    refresh,
    saveOwnerPayment,
    deleteOwnerPayment
  };
}
