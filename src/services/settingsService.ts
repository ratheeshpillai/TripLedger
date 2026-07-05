import { DEFAULT_SETTINGS } from "../constants/defaults";
import type { AppSettings } from "../types/settings";

export interface SettingsService {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
}

const SETTINGS_KEY = "tripledger.settings.v1";

export const localStorageSettingsService: SettingsService = {
  async getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<AppSettings> | null;
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  async saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }
};
