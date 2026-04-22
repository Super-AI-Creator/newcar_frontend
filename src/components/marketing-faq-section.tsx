import { ChevronDown } from "lucide-react";
import type { MarketingFaqItem } from "@/content/marketing-faq";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  heading: string;
  /** Optional short line under the H2. */
  kicker?: string;
  items: MarketingFaqItem[];
  variant?: "white" | "pearl";
};

/**
 * Visible FAQ block (native `<details>`) — pairs with FAQPage JSON-LD using the same `items` source.
 */
export function MarketingFaqSection({ id, heading, kicker, items, variant = "white" }: Props) {
  const hId = `${id}-heading`;
  return (
    <section
      id={id}
      className={cn(
        "border-b border-ink-200/80 py-10 sm:py-12",
        variant === "pearl" ? "bg-luxury-pearl" : "bg-white"
      )}
      aria-labelledby={hId}
    >
      <div className="container-wide max-w-3xl">
        <h2 id={hId} className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          {heading}
        </h2>
        {kicker ? <p className="mt-2 text-sm text-ink-600">{kicker}</p> : null}
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
          {items.map((faq, index) => (
            <details
              key={index}
              className="group border-b border-ink-100 last:border-b-0 open:bg-ink-50/50 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink-900 sm:px-5 sm:py-4 sm:text-[15px]">
                <span className="min-w-0 flex-1 pr-2">{faq.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-ink-100/80 px-4 pb-4 pt-0 text-sm leading-relaxed text-ink-700 sm:px-5 sm:pb-5">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
