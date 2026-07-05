import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS } from "../constants/defaults";
import { localStorageSettingsService, type SettingsService } from "../services/settingsService";
import type { AppSettings } from "../types/settings";

export function useSettings(service: SettingsService = localStorageSettingsService) {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    service.getSettings().then((saved) => {
      setSettingsState(saved);
      setLoading(false);
    });
  }, [service]);

  const api = useMemo(() => ({
    settings,
    loading,
    async saveSettings(next: AppSettings) {
      const saved = await service.saveSettings(next);
      setSettingsState(saved);
      return saved;
    }
  }), [loading, service, settings]);

  return api;
}
