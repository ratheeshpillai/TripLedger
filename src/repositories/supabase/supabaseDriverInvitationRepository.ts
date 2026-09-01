import type { DriverInvitationRepository } from "../driverInvitationRepository";
import type { AcceptedDriverInvitation, CreatedDriverInvitation, DriverInvitation, DriverInvitationDetails, DriverInvitationStatus } from "../../types/driverInvitation";
import { logDevError } from "../../utils/errors";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type InvitationRow = Database["public"]["Tables"]["driver_invitations"]["Row"];
type SafeInvitationRow = Omit<InvitationRow, "token_hash">;

function invitationStatus(status: string, expiresAt: string): DriverInvitationStatus {
  if (status === "pending" && new Date(expiresAt).getTime() <= Date.now()) return "expired";
  if (["pending", "accepted", "expired", "cancelled"].includes(status)) return status as DriverInvitationStatus;
  throw new Error("Unsupported driver invitation status.");
}

export function toDriverInvitation(row: SafeInvitationRow): DriverInvitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    driverId: row.driver_id,
    invitedEmail: row.invited_email,
    status: invitationStatus(row.status, row.expires_at),
    expiresAt: row.expires_at,
    invitedBy: row.invited_by,
    acceptedBy: row.accepted_by,
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const supabaseDriverInvitationRepository: DriverInvitationRepository = {
  async listInvitations(scope) {
    const { data, error } = await getSupabaseClient()
      .from("driver_invitations")
      .select("id,organization_id,driver_id,invited_email,status,expires_at,invited_by,accepted_by,accepted_at,cancelled_at,created_at,updated_at")
      .eq("organization_id", scope.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      logDevError("Supabase driver invitation list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toDriverInvitation);
  },

  async createInvitation(scope, driverId, email) {
    const { data, error } = await getSupabaseClient().rpc("create_driver_invitation", {
      p_organization_id: scope.organizationId,
      p_driver_id: driverId,
      p_invited_email: email
    }).single();

    if (error) {
      logDevError("Supabase driver invitation create failed", error);
      throw mapSupabaseError(error);
    }

    return {
      id: data.invitation_id,
      organizationId: data.organization_id,
      driverId: data.driver_id,
      invitedEmail: data.invited_email,
      status: invitationStatus(data.status, data.expires_at),
      expiresAt: data.expires_at,
      invitedBy: data.invited_by,
      acceptedBy: null,
      acceptedAt: null,
      cancelledAt: null,
      createdAt: data.created_at,
      updatedAt: data.created_at,
      token: data.invitation_token
    } satisfies CreatedDriverInvitation;
  },

  async cancelInvitation(scope, invitationId) {
    const { data, error } = await getSupabaseClient().rpc("cancel_driver_invitation", {
      p_organization_id: scope.organizationId,
      p_invitation_id: invitationId
    });

    if (error) {
      logDevError("Supabase driver invitation cancel failed", error);
      throw mapSupabaseError(error);
    }
    return toDriverInvitation(data);
  },

  async getInvitation(token) {
    const { data, error } = await getSupabaseClient().rpc("get_driver_invitation", {
      p_invitation_token: token
    }).single();

    if (error) {
      logDevError("Supabase driver invitation lookup failed", error);
      throw mapSupabaseError(error);
    }
    return {
      id: data.invitation_id,
      organizationName: data.organization_name,
      driverName: data.driver_name,
      invitedEmail: data.invited_email,
      status: invitationStatus(data.status, data.expires_at),
      expiresAt: data.expires_at
    } satisfies DriverInvitationDetails;
  },

  async acceptInvitation(token) {
    const { data, error } = await getSupabaseClient().rpc("accept_driver_invitation", {
      p_invitation_token: token
    }).single();

    if (error) {
      logDevError("Supabase driver invitation acceptance failed", error);
      throw mapSupabaseError(error);
    }
    return {
      id: data.invitation_id,
      organizationName: data.organization_name,
      driverName: data.driver_name,
      acceptedAt: data.accepted_at
    } satisfies AcceptedDriverInvitation;
  }
};
