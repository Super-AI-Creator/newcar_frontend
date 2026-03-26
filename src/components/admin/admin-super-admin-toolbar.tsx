"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  activeDealerCount?: number;
  activeTotalCount?: number;
  activeNewCount?: number;
  activeUsedCount?: number;
};

const MENU_LINK =
  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-800 transition hover:bg-ink-50";

export function AdminSuperAdminToolbar({
  activeDealerCount,
  activeTotalCount,
  activeNewCount,
  activeUsedCount,
}: Props) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
          {typeof activeDealerCount === "number"
            ? `${activeDealerCount.toLocaleString()} active dealers`
            : "Dealer metrics loading"}
        </Badge>
        <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
          {typeof activeTotalCount === "number"
            ? `${activeTotalCount.toLocaleString()} vehicles`
            : "Vehicle metrics loading"}
        </Badge>
        {typeof activeNewCount === "number" && typeof activeUsedCount === "number" && (
          <Badge className="border border-ink-200 bg-ink-100 text-ink-700">
            {activeNewCount.toLocaleString()} new · {activeUsedCount.toLocaleString()} used
          </Badge>
        )}
      </div>

      <details className="group relative self-end sm:self-auto">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm transition hover:bg-ink-50",
            "[&::-webkit-details-marker]:hidden"
          )}
        >
          More tools
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-500 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-[min(calc(100vw-2.5rem),18rem)] rounded-2xl border border-ink-200 bg-white p-2 shadow-lg">
          <p className="border-b border-ink-100 px-2 pb-2 text-xs leading-snug text-ink-500">
            Landing &amp; credit unions: edit in workspace tabs. Use fullscreen when you need a wider layout.
          </p>
          <nav className="mt-1 flex flex-col gap-0.5" aria-label="Super admin tools">
            <Link href="/admin/articles" className={MENU_LINK}>
              Articles
            </Link>
            <Link href="/admin/testimonials" className={MENU_LINK}>
              Testimonials
            </Link>
            <a
              href="/admin/landing-page"
              className={MENU_LINK}
            >
              Landing (fullscreen)
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
            </a>
            <a
              href="/admin/credit-unions"
              className={MENU_LINK}
            >
              Credit unions (fullscreen)
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
            </a>
          </nav>
        </div>
      </details>
    </div>
  );
}
