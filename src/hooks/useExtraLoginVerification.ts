import { useCallback, useEffect, useState } from "react";
import { authService, type AuthService } from "../services/authService";
import type { ExtraLoginVerificationEnrollment, ExtraLoginVerificationStatus } from "../types/auth";
import { getSafeErrorMessage, logDevError } from "../utils/errors";

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
      logDevError("MFA status load failed", statusError);
      setError(getSafeErrorMessage(statusError, "auth.mfa"));
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
      logDevError("MFA enrollment failed", enrollmentError);
      setError(getSafeErrorMessage(enrollmentError, "auth.mfa"));
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
      logDevError("MFA enrollment verification failed", verificationError);
      setError(getSafeErrorMessage(verificationError, "auth.mfa"));
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
      logDevError("MFA enrollment cancellation failed", cancelError);
      setError(getSafeErrorMessage(cancelError, "auth.mfa"));
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
      logDevError("MFA disable failed", disableError);
      setError(getSafeErrorMessage(disableError, "auth.mfa"));
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
