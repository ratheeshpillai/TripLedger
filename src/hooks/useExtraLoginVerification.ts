import { useCallback, useEffect, useState } from "react";
import { authService, type AuthService } from "../services/authService";
import type { ExtraLoginVerificationEnrollment, ExtraLoginVerificationStatus } from "../types/auth";

const DISABLED_STATUS: ExtraLoginVerificationStatus = {
  enabled: false,
  required: false
};

export function useExtraLoginVerification(service: AuthService = authService) {
  const [status, setStatus] = useState<ExtraLoginVerificationStatus>(DISABLED_STATUS);
  const [enrollment, setEnrollment] = useState<ExtraLoginVerificationEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await service.getExtraLoginVerificationStatus());
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to load verification settings.");
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startEnrollment() {
    setWorking(true);
    setError("");
    try {
      setEnrollment(await service.enrollExtraLoginVerification());
    } catch (enrollmentError) {
      setError(enrollmentError instanceof Error ? enrollmentError.message : "Unable to start login verification setup.");
    } finally {
      setWorking(false);
    }
  }

  async function confirmEnrollment(code: string) {
    if (!enrollment) throw new Error("Login verification setup has not started.");
    setWorking(true);
    setError("");
    try {
      await service.confirmExtraLoginVerification(enrollment.factorId, code);
      setEnrollment(null);
      setStatus(await service.getExtraLoginVerificationStatus());
    } catch (verificationError) {
      const message = verificationError instanceof Error ? verificationError.message : "Unable to verify this code.";
      setError(message);
      throw verificationError;
    } finally {
      setWorking(false);
    }
  }

  async function cancelEnrollment() {
    if (!enrollment) return;
    setWorking(true);
    setError("");
    try {
      await service.cancelExtraLoginVerificationEnrollment(enrollment.factorId);
      setEnrollment(null);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel verification setup.");
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true);
    setError("");
    try {
      setStatus(await service.disableExtraLoginVerification());
      setEnrollment(null);
    } catch (disableError) {
      const message = disableError instanceof Error ? disableError.message : "Unable to disable login verification.";
      setError(message);
      throw disableError;
    } finally {
      setWorking(false);
    }
  }

  return {
    status,
    enrollment,
    loading,
    working,
    error,
    startEnrollment,
    confirmEnrollment,
    cancelEnrollment,
    disable
  };
}
