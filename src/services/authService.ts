import type { AuthRepository } from "../repositories/authRepository";
import { supabaseAuthRepository } from "../repositories/supabase/supabaseAuthRepository";
import type { AuthCredentials, AuthUser } from "../types/auth";

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  signup(credentials: AuthCredentials): Promise<AuthUser | null>;
  logout(): Promise<void>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    getCurrentUser() {
      return repository.getCurrentUser();
    },
    login(credentials) {
      return repository.signIn(credentials);
    },
    signup(credentials) {
      return repository.signUp(credentials);
    },
    logout() {
      return repository.signOut();
    },
    onAuthStateChange(callback) {
      return repository.onAuthStateChange(callback);
    }
  };
}

export const authService = createAuthService(supabaseAuthRepository);
