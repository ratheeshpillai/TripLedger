import { DEFAULT_SETTINGS } from "../constants/defaults";
import type { SettingsRepository } from "../repositories/settingsRepository";
import { supabaseSettingsRepository } from "../repositories/supabase/supabaseSettingsRepository";
import type { AppSettings } from "../types/settings";

export interface SettingsService {
  getSettings(userId: string): Promise<AppSettings>;
  saveSettings(userId: string, settings: AppSettings): Promise<AppSettings>;
}

export type SettingsCache = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const LEGACY_SETTINGS_KEY = "tripledger.settings.v1";
const SETTINGS_KEY_PREFIX = `${LEGACY_SETTINGS_KEY}.`;

function settingsKey(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

function browserCache(): SettingsCache | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function normalize(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...merged,
    defaultDriverName: merged.defaultDriverName.trim(),
    defaultVehicleModel: merged.defaultVehicleModel.trim(),
    defaultVehicleNumber: merged.defaultVehicleNumber.trim()
  };
}

function readCache(userId: string, cache = browserCache()): AppSettings | null {
  if (!cache) return null;
  cache.removeItem(LEGACY_SETTINGS_KEY);
  try {
    const saved = JSON.parse(cache.getItem(settingsKey(userId)) ?? "null") as Partial<AppSettings> | null;
    return saved ? normalize(saved) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, settings: AppSettings, cache = browserCache()): void {
  cache?.setItem(settingsKey(userId), JSON.stringify(settings));
}

export function createSettingsService(repository: SettingsRepository, cache = browserCache()): SettingsService {
  return {
    async getSettings(userId) {
      const cached = readCache(userId, cache);
      try {
        const remote = await repository.getSettings(userId);
        if (remote) {
          const settings = normalize(remote);
          writeCache(userId, settings, cache);
          return settings;
        }
        if (cached) {
          const migrated = normalize(await repository.saveSettings(userId, cached));
          writeCache(userId, migrated, cache);
          return migrated;
        }
        return DEFAULT_SETTINGS;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    },
    async saveSettings(userId, settings) {
      const saved = normalize(await repository.saveSettings(userId, normalize(settings)));
      writeCache(userId, saved, cache);
      return saved;
    }
  };
}

export const localStorageSettingsService: SettingsService = {
  async getSettings(userId) {
    return readCache(userId) ?? DEFAULT_SETTINGS;
  },
  async saveSettings(userId, settings) {
    const saved = normalize(settings);
    writeCache(userId, saved);
    return saved;
  }
};

export const settingsService = createSettingsService(supabaseSettingsRepository);
