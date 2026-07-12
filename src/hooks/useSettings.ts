import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS } from "../constants/defaults";
import { localStorageSettingsService, type SettingsService } from "../services/settingsService";
import type { AppSettings } from "../types/settings";

export function useSettings(userId: string | null, service: SettingsService = localStorageSettingsService) {
  const [state, setState] = useState<{ userId: string | null; settings: AppSettings }>({ userId: null, settings: DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);
  const activeUserIdRef = useRef<string | null>(userId);

  useLayoutEffect(() => {
    activeUserIdRef.current = userId;
    setState({ userId, settings: DEFAULT_SETTINGS });
    setLoading(Boolean(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    service.getSettings(userId).then((saved) => {
      if (!active || activeUserIdRef.current !== userId) return;
      setState({ userId, settings: saved });
      setLoading(false);
    }).catch(() => {
      if (!active || activeUserIdRef.current !== userId) return;
      setState({ userId, settings: DEFAULT_SETTINGS });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [service, userId]);

  const settings = state.userId === userId ? state.settings : DEFAULT_SETTINGS;

  const api = useMemo(() => ({
    settings,
    loading,
    async saveSettings(next: AppSettings) {
      if (!userId) throw new Error("No authenticated user is available for settings.");
      const saved = await service.saveSettings(userId, next);
      if (activeUserIdRef.current === userId) setState({ userId, settings: saved });
      return saved;
    }
  }), [loading, service, settings, userId]);

  return api;
}
