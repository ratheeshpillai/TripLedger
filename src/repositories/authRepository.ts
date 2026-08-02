import type {
  AuthCredentials,
  AuthChangeType,
  AuthSessionState,
  AuthUser,
  ExtraLoginVerificationEnrollment,
  ExtraLoginVerificationStatus
} from "../types/auth";

export interface AuthRepository {
  getSessionState(): Promise<AuthSessionState>;
  signIn(credentials: AuthCredentials): Promise<AuthSessionState>;
  signUp(credentials: AuthCredentials, emailRedirectTo: string): Promise<AuthUser | null>;
  resendSignupConfirmation(email: string, emailRedirectTo: string): Promise<void>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
  hasActiveSession(): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  completeEmailVerification(callbackUrl: string): Promise<AuthSessionState>;
  signOut(): Promise<void>;
  getExtraLoginVerificationStatus(): Promise<ExtraLoginVerificationStatus>;
  enrollExtraLoginVerification(): Promise<ExtraLoginVerificationEnrollment>;
  confirmExtraLoginVerification(factorId: string, code: string): Promise<AuthSessionState>;
  cancelExtraLoginVerificationEnrollment(factorId: string): Promise<void>;
  disableExtraLoginVerification(): Promise<ExtraLoginVerificationStatus>;
  onAuthStateChange(callback: (event: AuthChangeType) => void): () => void;
}
