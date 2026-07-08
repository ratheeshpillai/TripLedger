import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../ui/cn";

export type AppPage = "logger" | "history" | "settings";

const navItems: Array<{ id: AppPage; label: string }> = [
  { id: "logger", label: "Logger" },
  { id: "history", label: "History" }
];

export function AppShell({ page, setPage, userEmail, isDarkMode, onToggleDarkMode, onLogout, children }: { page: AppPage; setPage: (page: AppPage) => void; userEmail?: string; isDarkMode: boolean; onToggleDarkMode: () => void; onLogout: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div className="app-shell min-h-screen bg-slate-50 dark:bg-[#0b1120]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800/80 dark:bg-[#0b1120]/90">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 pt-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">TripLedger</p>
            <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-slate-50 sm:text-3xl">Fleet & Billing Platform</h1>
          </div>
          <div ref={menuRef} className="relative ml-auto shrink-0 sm:ml-0">
            <button
              type="button"
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-[#1E3A8A] shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111827] dark:text-blue-200 dark:hover:bg-slate-800"
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30">
                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Signed in</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{userEmail || "TripLedger user"}</p>
                </div>

                <button
                  type="button"
                  className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    setPage("settings");
                    setMenuOpen(false);
                  }}
                >
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isDarkMode}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={onToggleDarkMode}
                >
                  <span>Dark Mode</span>
                  <span className="flex min-w-12 items-center justify-end">
                    <span className="theme-switch" aria-hidden="true">
                      <span className="theme-switch-thumb" />
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-[#111827] dark:text-red-300 dark:hover:bg-red-950/40"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 pb-5 pt-5 sm:gap-6 sm:px-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "relative cursor-pointer whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-black sm:px-6 sm:text-base",
                page === item.id
                  ? "text-white hover:text-white"
                  : "text-[#475569] hover:bg-[#E0E7FF] hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200"
              )}
            >
              {page === item.id && (
                <motion.span layoutId="activeTab" className="absolute inset-0 rounded-full bg-[#1E3A8A] shadow-sm dark:bg-blue-600" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <motion.main
        key={page}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
