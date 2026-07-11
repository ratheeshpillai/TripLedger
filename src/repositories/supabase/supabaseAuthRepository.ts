import type { User } from "@supabase/supabase-js";
import type { AuthRepository } from "../authRepository";
import type {
  AuthCredentials,
  AuthSessionState,
  AuthUser,
  ExtraLoginVerificationStatus
} from "../../types/auth";
import { getSupabaseClient } from "./supabaseClient";

function mapUser(user: User | null): AuthUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email
  };
}

function callbackError(url: URL): string | null {
  const queryError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return queryError || hash.get("error_description") || hash.get("error");
}

async function getExtraLoginVerificationStatus(): Promise<ExtraLoginVerificationStatus> {
  const client = getSupabaseClient();
  const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);

  if (factorsError) throw factorsError;
  if (assuranceError) throw assuranceError;

  const factor = factors.totp[0];
  const enabled = Boolean(factor);
  const required = enabled && assurance.currentLevel !== "aal2" && assurance.nextLevel === "aal2";

  return {
    enabled,
    required,
    factorId: factor?.id
  };
}

async function buildSessionState(user: User | null): Promise<AuthSessionState> {
  const authUser = mapUser(user);
  if (!authUser) {
    return { user: null, extraVerificationRequired: false };
  }

  const status = await getExtraLoginVerificationStatus();
  return {
    user: authUser,
    extraVerificationRequired: status.required,
    verificationFactorId: status.factorId
  };
}

export const supabaseAuthRepository: AuthRepository = {
  async getSessionState() {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    return buildSessionState(data.session?.user ?? null);
  },

  async signIn(credentials: AuthCredentials) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword(credentials);
    if (error) throw error;
    if (!data.user) throw new Error("Login succeeded but no user session was returned.");
    return buildSessionState(data.user);
  },

  async signUp(credentials: AuthCredentials, emailRedirectTo: string) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      ...credentials,
      options: { emailRedirectTo }
    });
    if (error) throw error;
    return mapUser(data.session?.user ?? null);
  },

  async completeEmailVerification(callbackUrl: string) {
    const client = getSupabaseClient();
    const url = new URL(callbackUrl);
    const errorMessage = callbackError(url);
    if (errorMessage) throw new Error(errorMessage);

    const code = url.searchParams.get("code");
    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return buildSessionState(data.session.user);
    }

    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      return buildSessionState(data.session?.user ?? null);
    }

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      throw new Error("This verification link is invalid or has expired. Please request a new verification email.");
    }
    return buildSessionState(data.session.user);
  },

  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  },

  getExtraLoginVerificationStatus,

  async enrollExtraLoginVerification() {
    const client = getSupabaseClient();
    const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const unfinishedFactors = factors.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified");
    await Promise.all(unfinishedFactors.map(async (factor) => {
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
    }));

    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "TripLedger Extra Login Verification",
      issuer: "TripLedger"
    });
    if (error) throw error;

    const qrCode = data.totp.qr_code.startsWith("data:")
      ? data.totp.qr_code
      : `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;

    return {
      factorId: data.id,
      qrCode,
      secret: data.totp.secret,
      uri: data.totp.uri
    };
  },

  async confirmExtraLoginVerification(factorId: string, code: string) {
    const { data, error } = await getSupabaseClient().auth.mfa.challengeAndVerify({
      factorId,
      code
    });
    if (error) throw error;
    return buildSessionState(data.user);
  },

  async cancelExtraLoginVerificationEnrollment(factorId: string) {
    const { error } = await getSupabaseClient().auth.mfa.unenroll({ factorId });
    if (error) throw error;
  },

  async disableExtraLoginVerification() {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) throw error;

    for (const factor of data.totp) {
      const { error: unenrollError } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) throw unenrollError;
    }

    return getExtraLoginVerificationStatus();
  },

  onAuthStateChange(callback) {
    const { data } = getSupabaseClient().auth.onAuthStateChange(() => {
      callback();
    });

    return () => data.subscription.unsubscribe();
  }
};
