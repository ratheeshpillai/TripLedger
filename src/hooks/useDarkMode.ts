import { useLayoutEffect, useState } from "react";

const THEME_KEY = "tripledger.theme";
let transitionTimer: number | undefined;

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved === "dark";
  return false;
}

function applyTheme(isDarkMode: boolean): void {
  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
}

function startThemeTransition(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("theme-transitioning");
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    document.documentElement.classList.remove("theme-transitioning");
  }, 180);
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  useLayoutEffect(() => {
    applyTheme(isDarkMode);
    localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  function toggleDarkMode() {
    startThemeTransition();
    setIsDarkMode((current) => !current);
  }

  return {
    isDarkMode,
    toggleDarkMode
  };
}
