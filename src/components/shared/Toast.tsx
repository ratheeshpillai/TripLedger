import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useIsMobile } from "../mobile/MobilePrimitives";
import { cn } from "../ui/cn";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastNotification = {
  id: number;
  message: string;
  tone: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 dark:border-emerald-900",
  error: "border-red-200 dark:border-red-900",
  warning: "border-amber-200 dark:border-amber-900",
  info: "border-blue-200 dark:border-blue-900"
};

const toneIconClasses: Record<ToastTone, string> = {
  success: "text-emerald-700 dark:text-emerald-300",
  error: "text-red-700 dark:text-red-300",
  warning: "text-amber-700 dark:text-amber-300",
  info: "text-[#1E3A8A] dark:text-blue-200"
};

function StatusIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <path d="m5 12 4 4L19 6" />;
  if (tone === "error") return <path d="m7 7 10 10M17 7 7 17" />;
  if (tone === "warning") return <><path d="M12 8v5" /><path d="M12 17h.01" /></>;
  return <><path d="M12 11v6" /><path d="M12 7h.01" /></>;
}

export function Toast({ notifications, onDismiss }: { notifications: ToastNotification[]; onDismiss: (id: number) => void }) {
  const isMobile = useIsMobile();
  const visible = isMobile ? notifications.slice(-1) : notifications;

  return createPortal(
    <div className={cn(
      "pointer-events-none fixed z-[70] flex max-w-[calc(100vw-2rem)] flex-col gap-2",
      isMobile
        ? "bottom-[calc(env(safe-area-inset-bottom)+10rem)] left-1/2 w-max -translate-x-1/2 items-center"
        : "right-6 top-24 w-[min(24rem,calc(100vw-3rem))] items-stretch"
    )} aria-label="Notifications">
      <AnimatePresence initial={false}>
        {visible.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: isMobile ? 0 : 18, y: isMobile ? 12 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMobile ? 0 : 18, y: isMobile ? 12 : 0 }}
            role={notification.tone === "error" || notification.tone === "warning" ? "alert" : "status"}
            aria-live={notification.tone === "error" || notification.tone === "warning" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto text-sm font-medium shadow-soft",
              isMobile
                ? "max-w-full rounded-xl bg-slate-950 px-3 py-2 text-center text-white"
                : "flex items-start gap-3 rounded-xl border bg-white p-3 text-left text-slate-700 shadow-lg dark:bg-[#111827] dark:text-slate-100 dark:shadow-black/30",
              !isMobile && toneClasses[notification.tone]
            )}
          >
            {!isMobile && (
              <svg className={cn("mt-0.5 h-5 w-5 shrink-0", toneIconClasses[notification.tone])} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <StatusIcon tone={notification.tone} />
              </svg>
            )}
            <span className="min-w-0 flex-1 whitespace-normal break-words">{notification.message}</span>
            {!isMobile && (
              <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="Dismiss notification" onClick={() => onDismiss(notification.id)}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
