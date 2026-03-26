import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-ink-200/80 bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-sm",
      className
    )}
    {...props}
  />
);

export { Badge };
