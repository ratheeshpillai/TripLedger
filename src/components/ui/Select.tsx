import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-950 outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-950/70",
        className
      )}
      {...props}
    />
  );
}
