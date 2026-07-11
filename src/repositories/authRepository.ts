import type {
  AuthCredentials,
  AuthSessionState,
  AuthUser,
  ExtraLoginVerificationEnrollment,
  ExtraLoginVerificationStatus
} from "../types/auth";

export interface AuthRepository {
  getSessionState(): Promise<AuthSessionState>;
  signIn(credentials: AuthCredentials): Promise<AuthSessionState>;
  signUp(credentials: AuthCredentials, emailRedirectTo: string): Promise<AuthUser | null>;
  completeEmailVerification(callbackUrl: string): Promise<AuthSessionState>;
  signOut(): Promise<void>;
  getExtraLoginVerificationStatus(): Promise<ExtraLoginVerificationStatus>;
  enrollExtraLoginVerification(): Promise<ExtraLoginVerificationEnrollment>;
  confirmExtraLoginVerification(factorId: string, code: string): Promise<AuthSessionState>;
  cancelExtraLoginVerificationEnrollment(factorId: string): Promise<void>;
  disableExtraLoginVerification(): Promise<ExtraLoginVerificationStatus>;
  onAuthStateChange(callback: () => void): () => void;
}
