export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSessionState {
  user: AuthUser | null;
  extraVerificationRequired: boolean;
  verificationFactorId?: string;
}

export type AuthChangeType = "PASSWORD_RECOVERY" | "OTHER";

export interface ExtraLoginVerificationStatus {
  enabled: boolean;
  required: boolean;
  factorId?: string;
}

export interface ExtraLoginVerificationEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}
