import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = { className?: string; variant?: "light" | "dark" };

export default function Logo({ className, variant = "dark" }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          isLight ? "bg-brand-500/20 text-brand-300" : "bg-brand-100 text-brand-700"
        )}
      >
        <CarFront className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex items-baseline gap-0.5">
        <span
          className={cn(
            "text-lg font-display font-bold tracking-tight sm:text-xl",
            isLight ? "text-white" : "text-ink-900"
          )}
        >
          NewCarSuperstore
        </span>
        <span className={cn("text-sm font-medium", isLight ? "text-zinc-400" : "text-ink-500")}>.com</span>
      </div>
    </div>
  );
}
