import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700",
      className
    )}
    {...props}
  />
);

export { Badge };
