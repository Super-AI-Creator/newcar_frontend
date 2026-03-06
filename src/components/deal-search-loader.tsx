"use client";

import { CarFront, Sparkles } from "lucide-react";

export default function DealSearchLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10" aria-live="polite" aria-busy="true">
      <div className="relative">
        <div className="absolute -inset-2 rounded-full bg-brand-100/70 blur-sm motion-reduce:hidden" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-white shadow-sm">
          <CarFront className="h-6 w-6 text-brand-700" />
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 motion-safe:animate-pulse text-emerald-500" />
        </div>
      </div>
      <p className="text-sm font-medium text-ink-700">Searching for the best deal...</p>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full w-1/3 motion-safe:animate-[loader-slide_1.5s_linear_infinite] rounded-full bg-brand-600" />
      </div>
      <style jsx>{`
        @keyframes loader-slide {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </div>
  );
}
