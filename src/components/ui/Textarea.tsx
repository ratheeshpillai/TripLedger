import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-950/70",
        className
      )}
      {...props}
    />
  );
}
