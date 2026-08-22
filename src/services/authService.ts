import type { AuthRepository } from "../repositories/authRepository";
import type {
  AuthCredentials,
  AuthChangeType,
  AuthSessionState,
  AuthUser,
  ExtraLoginVerificationEnrollment,
  ExtraLoginVerificationStatus
} from "../types/auth";

export interface AuthService {
  getSessionState(): Promise<AuthSessionState>;
  login(credentials: AuthCredentials): Promise<AuthSessionState>;
  signup(credentials: AuthCredentials, emailRedirectTo: string): Promise<AuthUser | null>;
  resendSignupConfirmation(email: string, emailRedirectTo: string): Promise<void>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
  hasActiveSession(): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  completeEmailVerification(callbackUrl: string): Promise<AuthSessionState>;
  logout(): Promise<void>;
  getExtraLoginVerificationStatus(): Promise<ExtraLoginVerificationStatus>;
  enrollExtraLoginVerification(): Promise<ExtraLoginVerificationEnrollment>;
  confirmExtraLoginVerification(factorId: string, code: string): Promise<AuthSessionState>;
  cancelExtraLoginVerificationEnrollment(factorId: string): Promise<void>;
  disableExtraLoginVerification(): Promise<ExtraLoginVerificationStatus>;
  onAuthStateChange(callback: (event: AuthChangeType) => void): () => void;
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
    resendSignupConfirmation(email, emailRedirectTo) {
      return repository.resendSignupConfirmation(email, emailRedirectTo);
    },
    sendPasswordReset(email, redirectTo) {
      return repository.sendPasswordReset(email, redirectTo);
    },
    hasActiveSession() {
      return repository.hasActiveSession();
    },
    updatePassword(password) {
      return repository.updatePassword(password);
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
