import type { AppSettings } from "../types/settings";

export interface SettingsRepository {
  getSettings(userId: string): Promise<AppSettings | null>;
  saveSettings(userId: string, settings: AppSettings): Promise<AppSettings>;
}
