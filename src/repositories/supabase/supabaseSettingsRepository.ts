import type { SettingsRepository } from "../settingsRepository";
import type { AppSettings, TimeFormat } from "../../types/settings";
import { logDevError } from "../../utils/errors";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type SettingsRow = Omit<Database["public"]["Tables"]["app_preferences"]["Row"], "created_at" | "updated_at">;
type SettingsInsert = Database["public"]["Tables"]["app_preferences"]["Insert"];

function toSettings(row: SettingsRow): AppSettings {
  return {
    timeFormat: row.time_format as TimeFormat,
    currencySymbol: row.currency_symbol,
    defaultBasePackage: row.default_base_package,
    defaultBaseHours: Number(row.default_base_hours),
    defaultBaseKm: Number(row.default_base_km),
    defaultBaseAmount: Number(row.default_base_amount),
    defaultExtraHourRate: Number(row.default_extra_hour_rate),
    defaultExtraKmRate: Number(row.default_extra_km_rate),
    defaultDriverName: row.default_driver_name,
    defaultVehicleModel: row.default_vehicle_model,
    defaultVehicleNumber: row.default_vehicle_number,
    businessName: row.business_name
  };
}

function toRow(userId: string, settings: AppSettings): SettingsInsert {
  return {
    user_id: userId,
    time_format: settings.timeFormat,
    currency_symbol: settings.currencySymbol,
    default_base_package: settings.defaultBasePackage,
    default_base_hours: settings.defaultBaseHours,
    default_base_km: settings.defaultBaseKm,
    default_base_amount: settings.defaultBaseAmount,
    default_extra_hour_rate: settings.defaultExtraHourRate,
    default_extra_km_rate: settings.defaultExtraKmRate,
    default_driver_name: settings.defaultDriverName,
    default_vehicle_model: settings.defaultVehicleModel,
    default_vehicle_number: settings.defaultVehicleNumber,
    business_name: settings.businessName
  };
}

export const supabaseSettingsRepository: SettingsRepository = {
  async getSettings(userId) {
    const { data, error } = await getSupabaseClient()
      .from("app_preferences")
      .select("user_id,time_format,currency_symbol,default_base_package,default_base_hours,default_base_km,default_base_amount,default_extra_hour_rate,default_extra_km_rate,default_driver_name,default_vehicle_model,default_vehicle_number,business_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logDevError("Supabase settings load failed", error);
      throw mapSupabaseError(error);
    }
    return data ? toSettings(data) : null;
  },

  async saveSettings(userId, settings) {
    const { data, error } = await getSupabaseClient()
      .from("app_preferences")
      .upsert(toRow(userId, settings), { onConflict: "user_id" })
      .select("user_id,time_format,currency_symbol,default_base_package,default_base_hours,default_base_km,default_base_amount,default_extra_hour_rate,default_extra_km_rate,default_driver_name,default_vehicle_model,default_vehicle_number,business_name")
      .single();

    if (error) {
      logDevError("Supabase settings save failed", error);
      throw mapSupabaseError(error);
    }
    return toSettings(data);
  }
};
