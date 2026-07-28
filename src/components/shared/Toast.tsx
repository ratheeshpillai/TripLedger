import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export function Toast({ message }: { message: string }) {
  return createPortal(
    <AnimatePresence>
      {message && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+10rem)] left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            role="status"
            aria-live="polite"
            className="rounded-xl bg-slate-950 px-3 py-2 text-center text-sm font-medium text-white shadow-soft"
          >
            {message}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  , document.body);
}
