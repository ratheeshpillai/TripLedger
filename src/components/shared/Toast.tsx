import { motion, AnimatePresence } from "framer-motion";

export function Toast({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-soft lg:bottom-6"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
