import { useEffect, useState } from "react";
import { authService, type AuthService } from "../services/authService";
import type { AuthSessionState, AuthUser } from "../types/auth";

export function useAuth(service: AuthService = authService) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [verificationFactorId, setVerificationFactorId] = useState<string | null>(null);
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
        setError(authError instanceof Error ? authError.message : "Unable to refresh authentication.");
        setUser(null);
      }
    }

    async function initializeAuth() {
      try {
        setError("");
        applySessionState(await service.getSessionState());
        unsubscribe = service.onAuthStateChange(() => {
          window.setTimeout(() => void refreshSessionState(), 0);
        });
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to initialize authentication.");
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

  async function signup(email: string, password: string) {
    setError("");
    const emailRedirectTo = new URL("/auth/callback", window.location.origin).toString();
    const nextUser = await service.signup({ email, password }, emailRedirectTo);
    if (nextUser) {
      applySessionState(await service.getSessionState());
    }
    return nextUser;
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
    completeEmailVerification,
    verifyExtraLogin,
    logout
  };
}
