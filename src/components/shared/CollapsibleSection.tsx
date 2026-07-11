import type { ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  contentId: string;
  children: ReactNode;
};

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-5 w-5 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CollapsibleSection({ title, open, onToggle, contentId, children }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/20">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 sm:px-5"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <h2 className="text-sm font-black uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">{title}</h2>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-[#1E3A8A] dark:bg-slate-800 dark:text-blue-200">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div id={contentId} className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-[#0f172a]/65 sm:p-5">
          {children}
        </div>
      )}
    </section>
  );
}
