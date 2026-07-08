import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "./cn";

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/20", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("border-b border-slate-100 p-5 dark:border-slate-700", className)} {...props}>{children}</div>;
}

export function CardContent({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("p-5", className)} {...props}>{children}</div>;
}
