import type { User } from "@supabase/supabase-js";
import type { AuthRepository } from "../authRepository";
import type { AuthCredentials, AuthUser } from "../../types/auth";
import { getSupabaseClient } from "./supabaseClient";

function mapUser(user: User | null): AuthUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email
  };
}

export const supabaseAuthRepository: AuthRepository = {
  async getCurrentUser() {
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    return mapUser(data.user);
  },

  async signIn(credentials: AuthCredentials) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword(credentials);
    if (error) throw error;
    const user = mapUser(data.user);
    if (!user) throw new Error("Login succeeded but no user session was returned.");
    return user;
  },

  async signUp(credentials: AuthCredentials) {
    const { data, error } = await getSupabaseClient().auth.signUp(credentials);
    if (error) throw error;
    return mapUser(data.session?.user ?? null);
  },

  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      callback(mapUser(session?.user ?? null));
    });

    return () => data.subscription.unsubscribe();
  }
};
