import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "box-border block min-h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-950/70 max-lg:min-h-12 max-lg:py-2 lg:text-sm",
        className
      )}
      {...props}
    />
  );
}
