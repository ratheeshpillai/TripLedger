import { useEffect, useState } from "react";

const THEME_KEY = "tripledger.theme";

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(isDarkMode: boolean): void {
  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    applyTheme(isDarkMode);
    localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  function toggleDarkMode() {
    setIsDarkMode((current) => !current);
  }

  return {
    isDarkMode,
    toggleDarkMode
  };
}
