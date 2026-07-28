import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useDialogFocus } from "../ui/useDialogFocus";
import { cn } from "../ui/cn";

export function useIsMobile() {
  const query = "(max-width: 1023px)";
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}

export function MobilePageHeader({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button type="button" onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Go back">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black leading-tight text-slate-950 dark:text-slate-50">{title}</h1>
          {subtitle && <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function MobileBottomNav<T extends string>({ items, current, onChange }: {
  items: Array<{ id: T; label: string; icon: ReactNode; primary?: boolean }>;
  current: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-[#0b1120]/95 lg:hidden" aria-label="Primary">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
                item.primary
                  ? "-mt-5 text-[#1E3A8A] dark:text-blue-200"
                  : active
                    ? "bg-blue-50 text-[#1E3A8A] dark:bg-slate-800 dark:text-blue-200"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <span className={cn("grid place-items-center", item.primary ? "h-12 w-12 rounded-full bg-[#1E3A8A] text-white shadow-lg shadow-blue-950/20 dark:bg-blue-600" : "h-6 w-6")}>{item.icon}</span>
              <span className="truncate leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileBottomSheet({ open, title, description, closeLabel, onClose, children, footer }: {
  open: boolean;
  title: string;
  description?: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/50 p-0 lg:hidden" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="max-h-[88dvh] w-full overflow-hidden rounded-t-3xl border border-b-0 border-slate-200 bg-white shadow-2xl focus:outline-none dark:border-slate-700 dark:bg-[#111827]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-2 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
            {description && <p id={descriptionId} className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800" onClick={onClose} aria-label={closeLabel || `Close ${title}`}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="max-h-[calc(88dvh-8rem)] overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && <footer className="border-t border-slate-100 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 dark:border-slate-800">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function MobileStickyActions({ children }: { children: ReactNode }) {
  return <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.65rem)] z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-[#0b1120]/95 lg:hidden"><div className="mx-auto max-w-lg">{children}</div></div>;
}

export function MobileSection({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827]", className)}>
      {title && <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>}
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      <div className={cn((title || description) && "mt-4")}>{children}</div>
    </section>
  );
}

export function MobileEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center dark:border-slate-700 dark:bg-[#111827]"><h2 className="font-black text-slate-950 dark:text-slate-50">{title}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function MobileStatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", tone === "warning" && "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300", tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300", tone === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>{label}</span>;
}
