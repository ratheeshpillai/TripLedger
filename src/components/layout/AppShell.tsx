import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../ui/cn";

export type AppPage = "dashboard" | "logger" | "history" | "settings";

const navItems: Array<{ id: Exclude<AppPage, "settings">; label: string; icon: "dashboard" | "logger" | "history" }> = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "logger", label: "Create Bill", icon: "logger" },
  { id: "history", label: "History", icon: "history" }
];

const pageTitles: Record<AppPage, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: "Dashboard", title: "Billing Overview" },
  logger: { eyebrow: "Create Bill", title: "Logger" },
  history: { eyebrow: "History", title: "Saved Bills" },
  settings: { eyebrow: "Settings", title: "Account & App Settings" }
};

const SIDEBAR_COLLAPSED_KEY = "tripledger-sidebar-collapsed";

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function NavIcon({ icon }: { icon: "dashboard" | "logger" | "history" }) {
  if (icon === "dashboard") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13h7V4H4v9Zm0 7h7v-4H4v4Zm10 0h6v-9h-6v9Zm0-12h6V4h-6v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "history") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 4v4h4M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ page, setPage, userEmail, isDarkMode, onToggleDarkMode, onLogout, children }: { page: AppPage; setPage: (page: AppPage) => void; userEmail?: string; isDarkMode: boolean; onToggleDarkMode: () => void; onLogout: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pageTitle = pageTitles[page];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="app-shell min-h-screen bg-slate-50 dark:bg-[#0b1120]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white px-3 py-5 transition-[width] duration-200 ease-out dark:border-slate-800 dark:bg-[#0b1120] lg:flex lg:flex-col",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex min-h-14 items-start justify-between gap-2 px-1">
          <div className={cn("min-w-0 overflow-hidden transition-opacity duration-150", sidebarCollapsed && "pointer-events-none opacity-0")}>
            <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">TripLedger</p>
            <h1 className="mt-1 whitespace-nowrap text-lg font-black leading-tight text-slate-950 dark:text-slate-50">Fleet & Billing</h1>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-[#1E3A8A] shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-[#111827] dark:text-blue-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
            aria-label={sidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={toggleSidebarCollapsed}
          >
            <svg className={cn("h-4 w-4 transition-transform duration-200 ease-out", sidebarCollapsed ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "group flex min-h-11 cursor-pointer items-center rounded-2xl px-3 text-left text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
                sidebarCollapsed ? "justify-center" : "gap-3",
                page === item.id
                  ? "bg-[#1E3A8A] text-white shadow-sm dark:bg-blue-600"
                  : "text-slate-600 hover:bg-blue-50 hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200"
              )}
              aria-current={page === item.id ? "page" : undefined}
              aria-label={item.label}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <NavIcon icon={item.icon} />
              <span className={cn("whitespace-nowrap transition-[opacity,width] duration-150", sidebarCollapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100")}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className={cn("transition-[padding] duration-200 ease-out", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800/80 dark:bg-[#0b1120]/90">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="lg:hidden">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">TripLedger</p>
              <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-slate-50 sm:text-3xl">Fleet & Billing Platform</h1>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">{pageTitle.eyebrow}</p>
              <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-slate-50">{pageTitle.title}</h1>
            </div>
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
        <nav className="mx-auto hidden max-w-7xl gap-3 overflow-x-auto px-4 pb-4 sm:px-6 md:flex lg:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "relative inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-black",
                page === item.id
                  ? "text-white hover:text-white"
                  : "text-[#475569] hover:bg-[#E0E7FF] hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200"
              )}
            >
              {page === item.id && (
                <motion.span layoutId="activeTab" className="absolute inset-0 rounded-full bg-[#1E3A8A] shadow-sm dark:bg-blue-600" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
              )}
              <span className="relative z-10"><NavIcon icon={item.icon} /></span>
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
        className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 md:pb-8"
      >
        {children}
      </motion.main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-[#0b1120]/95 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-black",
                page === item.id
                  ? "bg-[#1E3A8A] text-white shadow-sm dark:bg-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200"
              )}
            >
              <NavIcon icon={item.icon} />
              <span className="leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      </div>
    </div>
  );
}
