import { DEFAULT_SETTINGS } from "../constants/defaults";
import type { AppSettings } from "../types/settings";

export interface SettingsService {
  getSettings(userId: string): Promise<AppSettings>;
  saveSettings(userId: string, settings: AppSettings): Promise<AppSettings>;
}

const LEGACY_SETTINGS_KEY = "tripledger.settings.v1";
const SETTINGS_KEY_PREFIX = `${LEGACY_SETTINGS_KEY}.`;

function settingsKey(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

export const localStorageSettingsService: SettingsService = {
  async getSettings(userId) {
    // The unscoped value may belong to another person on a shared browser, so it is discarded rather than assigned.
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey(userId)) ?? "null") as Partial<AppSettings> | null;
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  async saveSettings(userId, settings) {
    localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
    return settings;
  }
};
