import type { AuthRepository } from "../repositories/authRepository";
import { supabaseAuthRepository } from "../repositories/supabase/supabaseAuthRepository";
import type {
  AuthCredentials,
  AuthSessionState,
  AuthUser,
  ExtraLoginVerificationEnrollment,
  ExtraLoginVerificationStatus
} from "../types/auth";

export interface AuthService {
  getSessionState(): Promise<AuthSessionState>;
  login(credentials: AuthCredentials): Promise<AuthSessionState>;
  signup(credentials: AuthCredentials, emailRedirectTo: string): Promise<AuthUser | null>;
  completeEmailVerification(callbackUrl: string): Promise<AuthSessionState>;
  logout(): Promise<void>;
  getExtraLoginVerificationStatus(): Promise<ExtraLoginVerificationStatus>;
  enrollExtraLoginVerification(): Promise<ExtraLoginVerificationEnrollment>;
  confirmExtraLoginVerification(factorId: string, code: string): Promise<AuthSessionState>;
  cancelExtraLoginVerificationEnrollment(factorId: string): Promise<void>;
  disableExtraLoginVerification(): Promise<ExtraLoginVerificationStatus>;
  onAuthStateChange(callback: () => void): () => void;
}

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    getSessionState() {
      return repository.getSessionState();
    },
    login(credentials) {
      return repository.signIn(credentials);
    },
    signup(credentials, emailRedirectTo) {
      return repository.signUp(credentials, emailRedirectTo);
    },
    completeEmailVerification(callbackUrl) {
      return repository.completeEmailVerification(callbackUrl);
    },
    logout() {
      return repository.signOut();
    },
    getExtraLoginVerificationStatus() {
      return repository.getExtraLoginVerificationStatus();
    },
    enrollExtraLoginVerification() {
      return repository.enrollExtraLoginVerification();
    },
    confirmExtraLoginVerification(factorId, code) {
      return repository.confirmExtraLoginVerification(factorId, code);
    },
    cancelExtraLoginVerificationEnrollment(factorId) {
      return repository.cancelExtraLoginVerificationEnrollment(factorId);
    },
    disableExtraLoginVerification() {
      return repository.disableExtraLoginVerification();
    },
    onAuthStateChange(callback) {
      return repository.onAuthStateChange(callback);
    }
  };
}

export const authService = createAuthService(supabaseAuthRepository);
