import type { Organization } from "../../types/organization";
import type { OrganizationRepository } from "../organizationRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type OrganizationRole = Database["public"]["Enums"]["organization_role"];

function toOrganization(row: OrganizationRow, role: OrganizationRole): Organization {
  return {
    id: row.id,
    name: row.name,
    businessType: row.business_type,
    role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const supabaseOrganizationRepository: OrganizationRepository = {
  async getDefaultOrganization(userId) {
    const { data: membership, error: membershipError } = await getSupabaseClient()
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (membershipError) throw mapSupabaseError(membershipError);

    const { data, error } = await getSupabaseClient()
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .single();

    if (error) throw mapSupabaseError(error);
    return toOrganization(data, membership.role);
  }
};
