import { useEffect, useState } from "react";
import { appServices } from "../app/appDependencies";
import type { AuthService } from "../services/authService";
import type { AuthSessionState, AuthUser } from "../types/auth";
import { getSafeErrorMessage, logDevError } from "../utils/errors";
import type { OrganizationBusinessType } from "../types/organization";

const RECOVERY_FLAG = "tripledger:password-recovery";

function hasRecoveryUrlHint(): boolean {
  if (window.location.pathname.replace(/\/+$/, "") !== "/reset-password") return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.has("code") || search.get("type") === "recovery" || hash.get("type") === "recovery";
}

export function useAuth(service: AuthService = appServices.auth) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [verificationFactorId, setVerificationFactorId] = useState<string | null>(null);
  const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(() => window.sessionStorage.getItem(RECOVERY_FLAG) === "1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    function applySessionState(state: AuthSessionState) {
      if (!active) return;
      if (state.extraVerificationRequired && state.user && state.verificationFactorId) {
        setUser(null);
        setPendingUser(state.user);
        setVerificationFactorId(state.verificationFactorId);
        return;
      }

      setUser(state.user);
      setPendingUser(null);
      setVerificationFactorId(null);
    }

    async function refreshSessionState() {
      try {
        applySessionState(await service.getSessionState());
      } catch (authError) {
        if (!active) return;
        logDevError("Auth session refresh failed", authError);
        setError(getSafeErrorMessage(authError, "auth.initialize"));
        setUser(null);
      }
    }

    async function initializeAuth() {
      try {
        setError("");
        applySessionState(await service.getSessionState());
        unsubscribe = service.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            window.sessionStorage.setItem(RECOVERY_FLAG, "1");
            setPasswordRecoveryReady(true);
          }
          window.setTimeout(() => void refreshSessionState(), 0);
        });
      } catch (authError) {
        logDevError("Auth initialization failed", authError);
        setError(getSafeErrorMessage(authError, "auth.initialize"));
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void initializeAuth();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [service]);

  function applySessionState(state: AuthSessionState) {
    if (state.extraVerificationRequired && state.user && state.verificationFactorId) {
      setUser(null);
      setPendingUser(state.user);
      setVerificationFactorId(state.verificationFactorId);
    } else {
      setUser(state.user);
      setPendingUser(null);
      setVerificationFactorId(null);
    }
    return state;
  }

  async function login(email: string, password: string) {
    setError("");
    return applySessionState(await service.login({ email, password }));
  }

  async function signup(email: string, password: string, businessType: OrganizationBusinessType) {
    setError("");
    const emailRedirectTo = new URL("/auth/callback", window.location.origin).toString();
    const nextUser = await service.signup({ email, password, businessType }, emailRedirectTo);
    if (nextUser) {
      applySessionState(await service.getSessionState());
    }
    return nextUser;
  }

  async function resendSignupConfirmation(email: string) {
    const emailRedirectTo = new URL("/auth/callback", window.location.origin).toString();
    await service.resendSignupConfirmation(email, emailRedirectTo);
  }

  async function sendPasswordReset(email: string) {
    const redirectTo = new URL("/reset-password", window.location.origin).toString();
    await service.sendPasswordReset(email, redirectTo);
  }

  async function refreshPasswordRecoveryState() {
    if (!window.sessionStorage.getItem(RECOVERY_FLAG) && !hasRecoveryUrlHint()) return false;
    const hasSession = await service.hasActiveSession();
    setPasswordRecoveryReady(hasSession);
    if (hasSession) window.sessionStorage.setItem(RECOVERY_FLAG, "1");
    else window.sessionStorage.removeItem(RECOVERY_FLAG);
    return hasSession;
  }

  async function updatePassword(password: string) {
    setError("");
    await service.updatePassword(password);
    window.sessionStorage.removeItem(RECOVERY_FLAG);
    setPasswordRecoveryReady(false);
    await logout();
  }

  async function completeEmailVerification(callbackUrl: string) {
    setError("");
    return applySessionState(await service.completeEmailVerification(callbackUrl));
  }

  async function verifyExtraLogin(code: string) {
    if (!verificationFactorId) throw new Error("No login verification request is active.");
    setError("");
    return applySessionState(await service.confirmExtraLoginVerification(verificationFactorId, code));
  }

  async function logout() {
    setError("");
    await service.logout();
    setUser(null);
    setPendingUser(null);
    setVerificationFactorId(null);
  }

  return {
    user,
    verificationEmail: pendingUser?.email,
    extraVerificationRequired: Boolean(pendingUser && verificationFactorId),
    loading,
    error,
    login,
    signup,
    resendSignupConfirmation,
    sendPasswordReset,
    passwordRecoveryReady,
    refreshPasswordRecoveryState,
    updatePassword,
    completeEmailVerification,
    verifyExtraLogin,
    logout
  };
}
