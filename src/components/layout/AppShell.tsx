import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export type AppPage = "logger" | "history" | "settings";

const navItems: Array<{ id: AppPage; label: string }> = [
  { id: "logger", label: "Logger" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" }
];

export function AppShell({ page, setPage, userEmail, onLogout, children }: { page: AppPage; setPage: (page: AppPage) => void; userEmail?: string; onLogout: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">TripLedger</p>
            <h1 className="text-lg font-black text-slate-950 sm:text-2xl">Fleet & Billing Platform</h1>
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            {userEmail && <span className="max-w-[160px] truncate text-xs font-semibold text-slate-500 sm:max-w-none">{userEmail}</span>}
            <button className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-slate-950" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "relative cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition duration-200",
                page === item.id
                  ? "text-white hover:text-white"
                  : "text-[#475569] hover:bg-[#E0E7FF] hover:text-[#1E3A8A]"
              )}
            >
              {page === item.id && (
                <motion.span layoutId="activeTab" className="absolute inset-0 rounded-full bg-[#1E3A8A]" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
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
