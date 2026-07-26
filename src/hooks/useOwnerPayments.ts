import { useEffect, useRef, useState } from "react";
import { ownerPaymentService, type OwnerPaymentService } from "../services/ownerPaymentService";
import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import { LatestRequestGuard } from "../utils/latestRequestGuard";
import { createRequestId } from "../utils/requestId";

export function useOwnerPayments(userId: string | null, service: OwnerPaymentService = ownerPaymentService) {
  const [payments, setPayments] = useState<OwnerPayment[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const requestGuardRef = useRef(new LatestRequestGuard<string | null>(userId));
  const savePromiseRef = useRef<Promise<OwnerPayment> | null>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const deletePromiseByIdRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    requestGuardRef.current.changeOwner(userId);
    setPayments([]);
    setError("");
    setSaving(false);
    setDeletingIds([]);
    savePromiseRef.current = null;
    createRequestIdRef.current = null;
    deletePromiseByIdRef.current.clear();
    setLoading(Boolean(userId));
  }, [userId]);

  async function refresh(billingPartyId?: string) {
    const requestUserId = userId;
    if (!requestUserId || !requestGuardRef.current.isOwnerActive(requestUserId)) return;

    const requestTicket = requestGuardRef.current.begin(requestUserId);
    const isCurrentRequest = () => requestGuardRef.current.isCurrent(requestTicket);

    try {
      setError("");
      setLoading(true);
      const saved = await service.listOwnerPayments(requestUserId, billingPartyId);
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

  useEffect(() => {
    void refresh();
  }, [userId]);

  async function saveOwnerPayment(draft: OwnerPaymentDraft, editingId?: string | null) {
    if (!userId) throw new Error("You must be logged in to save an owner payment.");
    if (savePromiseRef.current) return savePromiseRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const existing = editingId ? payments.find((payment) => payment.id === editingId) : null;
      const saved = existing
        ? await service.updateOwnerPayment(userId, { ...existing, ...draft, id: editingId!, createdAt: existing.createdAt, updatedAt: existing.updatedAt })
        : await (async () => {
          createRequestIdRef.current = createRequestIdRef.current ?? createRequestId();
          const created = await service.saveOwnerPayment(userId, draft, createRequestIdRef.current);
          createRequestIdRef.current = null;
          return created;
        })();
      await refresh();
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
    if (!userId) throw new Error("You must be logged in to delete an owner payment.");
    const existingDelete = deletePromiseByIdRef.current.get(id);
    if (existingDelete) return existingDelete;

    const deletePromise = (async () => {
      setDeletingIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      await service.deleteOwnerPayment(userId, id);
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
