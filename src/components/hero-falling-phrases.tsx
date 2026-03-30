"use client";

import type { CSSProperties } from "react";
import type { LandingHeroFallingPhrases } from "@/lib/api";

export const DEFAULT_FALLING_PHRASES: string[] = [
  "The #1 Dealer Site",
  "It's Very Easy",
  "Shop From Home",
  "Delivered to Your Door",
  "Licensed Auto Broker",
  "Red Bow Delivery",
  "Fast & Painless",
  "Statewide Inventory"
];

const DEFAULTS: Required<LandingHeroFallingPhrases> = {
  enabled: true,
  phrases: DEFAULT_FALLING_PHRASES,
  duration_min: 19,
  duration_max: 26,
  max_phrases: 8,
  stagger: 2.4
};

function resolveConfig(raw?: LandingHeroFallingPhrases): Required<LandingHeroFallingPhrases> {
  const phrases =
    raw?.phrases && raw.phrases.length ? raw.phrases.map((p) => String(p).trim()).filter(Boolean) : DEFAULTS.phrases;
  return {
    enabled: raw?.enabled !== false,
    phrases,
    duration_min: Math.max(8, Math.min(90, Number(raw?.duration_min) || DEFAULTS.duration_min)),
    duration_max: Math.max(8, Math.min(120, Number(raw?.duration_max) || DEFAULTS.duration_max)),
    max_phrases: Math.max(1, Math.min(24, Number(raw?.max_phrases) || DEFAULTS.max_phrases)),
    stagger: Math.max(0.8, Math.min(5, Number(raw?.stagger) || DEFAULTS.stagger))
  };
}

function phraseStyle(index: number, total: number, cfg: Required<LandingHeroFallingPhrases>): CSSProperties {
  const left = 4 + ((index * 41) % 72);
  const rotate = ((index * 23) % 30) - 15;
  const sizeRem = 0.7 + ((index * 3) % 6) * 0.11;
  let lo = cfg.duration_min;
  let hi = cfg.duration_max;
  if (lo > hi) [lo, hi] = [hi, lo];
  const span = Math.max(1, hi - lo + 1);
  const duration = lo + ((index * 5) % span);
  const cycleSpread = duration / Math.max(total, 1);
  const delay = index * cycleSpread * cfg.stagger;
  const opacity = 0.12 + ((index * 5) % 6) * 0.028;
  return {
    left: `${left}%`,
    "--phrase-rotate": `${rotate}deg`,
    "--phrase-opacity": String(opacity),
    fontSize: `${sizeRem}rem`,
    animationDuration: `${duration}s`,
    animationDelay: `-${delay}s`
  } as CSSProperties;
}

type Props = { config?: LandingHeroFallingPhrases };

export default function HeroFallingPhrases({ config }: Props) {
  const cfg = resolveConfig(config);
  if (!cfg.enabled) return null;
  const phrases = cfg.phrases.slice(0, cfg.max_phrases);
  if (!phrases.length) return null;

  return (
    <div
      className="hero-falling-phrases-root pointer-events-none absolute -left-4 -right-4 -top-28 bottom-0 z-0 overflow-hidden sm:-left-8 sm:-right-8"
      aria-hidden
    >
      {phrases.map((text, i) => (
        <span
          key={`${text}-${i}`}
          className="hero-falling-phrase absolute top-0 whitespace-nowrap font-display font-semibold tracking-tight text-white select-none"
          style={phraseStyle(i, phrases.length, cfg)}
        >
          {text}
        </span>
      ))}
    </div>
  );
}
