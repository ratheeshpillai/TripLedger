import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export type AppPage = "logger" | "history" | "summary" | "settings";

const navItems: Array<{ id: AppPage; label: string }> = [
  { id: "logger", label: "Logger" },
  { id: "history", label: "History" },
  { id: "summary", label: "Bill Summary" },
  { id: "settings", label: "Settings" }
];

export function AppShell({ page, setPage, selectedCount, children }: { page: AppPage; setPage: (page: AppPage) => void; selectedCount: number; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">TripLedger</p>
            <h1 className="text-lg font-black text-slate-950 sm:text-2xl">Fleet & Billing Platform</h1>
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:block">
            {selectedCount} selected
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition",
                page === item.id && "text-white"
              )}
            >
              {page === item.id && (
                <motion.span layoutId="activeTab" className="absolute inset-0 rounded-full bg-slate-950" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
              )}
              <span className="relative">{item.label}</span>
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
