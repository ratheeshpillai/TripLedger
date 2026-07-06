import { useEffect, useState } from "react";
import { authService, type AuthService } from "../services/authService";
import type { AuthUser } from "../types/auth";

export function useAuth(service: AuthService = authService) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initializeAuth() {
      try {
        setError("");
        const currentUser = await service.getCurrentUser();
        setUser(currentUser);
        unsubscribe = service.onAuthStateChange(setUser);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to initialize authentication.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void initializeAuth();
    return () => unsubscribe?.();
  }, [service]);

  async function login(email: string, password: string) {
    setError("");
    const nextUser = await service.login({ email, password });
    setUser(nextUser);
    return nextUser;
  }

  async function signup(email: string, password: string) {
    setError("");
    const nextUser = await service.signup({ email, password });
    setUser(nextUser);
    return nextUser;
  }

  async function logout() {
    setError("");
    await service.logout();
    setUser(null);
  }

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout
  };
}
