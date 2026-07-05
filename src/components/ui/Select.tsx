import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition duration-200 focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}
