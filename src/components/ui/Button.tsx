import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "neutral" | "ghost" | "danger";

export function Button({ children, className, variant = "secondary", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#1E3A8A] text-white shadow-sm hover:bg-[#1D4ED8]",
        variant === "secondary" && "border border-[#1E3A8A] bg-white text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white",
        variant === "neutral" && "border border-slate-300 bg-white text-[#475569] hover:border-red-300 hover:bg-red-50 hover:text-red-700",
        variant === "ghost" && "text-[#1E3A8A] hover:bg-[#E0E7FF] hover:text-[#1E3A8A]",
        variant === "danger" && "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
