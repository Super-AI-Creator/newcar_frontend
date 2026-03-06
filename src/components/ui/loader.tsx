import { cn } from "@/lib/utils";

type LoaderVariant = "dots" | "spinner";

interface LoaderProps {
  variant?: LoaderVariant;
  label?: string;
  className?: string;
}

/** Modern loading indicator: smooth bouncing dots (default) or spinner. */
export function Loader({ variant = "dots", label, className }: LoaderProps) {
  if (variant === "spinner") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
        <div
          className="h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin"
          aria-hidden
        />
        {label && <p className="text-sm text-ink-500">{label}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)} aria-label={label ?? "Loading"}>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full bg-brand-500 animate-loader-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-brand-500 animate-loader-bounce"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-brand-500 animate-loader-bounce"
          style={{ animationDelay: "320ms" }}
        />
      </div>
      {label && <p className="text-sm font-medium text-ink-500">{label}</p>}
    </div>
  );
}
