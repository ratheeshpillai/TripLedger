import type { Organization } from "../../types/organization";
import type { OrganizationRepository } from "../organizationRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const supabaseOrganizationRepository: OrganizationRepository = {
  async getDefaultOrganization() {
    const { data, error } = await getSupabaseClient()
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) throw mapSupabaseError(error);
    return toOrganization(data);
  }
};
