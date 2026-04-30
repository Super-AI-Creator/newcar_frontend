"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { normalizeLegacyPublicImageUrl } from "@/lib/landing-hero-slides";

const LANDING_SLIDES = [
  { src: "/images/landing-1.jpg", alt: "A happy woman leans against a new red Subaru.", focus: "center" },
  { src: "/images/landing-2.jpg", alt: "A happy family posing with their new Honda Civic.", focus: "center" },
  { src: "/images/landing-3.jpg", alt: "Four people posing with thumbs up beside three cars.", focus: "center" },
  { src: "/images/landing-4.jpg", alt: "Two men shaking hands in front of a BMW.", focus: "center" },
];

const ROTATE_MS = 5000;

type Slide = { src: string; alt: string; focus?: string };

type Props = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  slides?: Slide[];
  /** Fires when all slide images have finished loading (or failed). */
  onImagesReadyChange?: (ready: boolean) => void;
};

export default function LandingHeroCarousel({
  className = "",
  imageClassName = "",
  priority = false,
  slides: slidesProp,
  onImagesReadyChange,
}: Props) {
  const slides = slidesProp !== undefined ? slidesProp : LANDING_SLIDES;
  const slidesSig = slides.map((s) => s.src).join("\0");
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setIndex(0);
    setLoaded({});
  }, [slidesSig]);

  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const markLoaded = useCallback((i: number) => {
    setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
  }, []);

  const allImagesReady = slides.length > 0 && slides.every((_, i) => loaded[i]);

  const onReadyRef = useRef(onImagesReadyChange);
  onReadyRef.current = onImagesReadyChange;
  useEffect(() => {
    onReadyRef.current?.(allImagesReady);
  }, [allImagesReady]);

  const isExternal = (src: string) => src.startsWith("http://") || src.startsWith("https://");

  /** Map legacy DB paths; external URLs with spaces need encoding for plain `<img>`. */
  const resolvedSrc = (src: string) => {
    if (isExternal(src)) {
      return /\s/.test(src) ? encodeURI(src) : src;
    }
    return normalizeLegacyPublicImageUrl(src);
  };

  const focusToCss = (focus?: string) => {
    const v = (focus ?? "center").toLowerCase();
    if (v === "top") return "50% 0%";
    if (v === "bottom") return "50% 100%";
    if (v === "left") return "0% 50%";
    if (v === "right") return "100% 50%";
    return "50% 50%";
  };

  return (
    <div className={`relative h-full w-full overflow-hidden bg-ink-950 ${className}`}>
      {slides.length > 0 ? (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${allImagesReady ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!allImagesReady}
        >
          {slides.map((slide, i) => (
            <div
              key={`${i}:${slide.src}`}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === index ? 1 : 0 }}
              aria-hidden={i !== index}
            >
              {isExternal(slide.src) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedSrc(slide.src)}
                  alt={i === index ? slide.alt : ""}
                  loading="eager"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-contain object-center ${imageClassName}`}
                  style={{ objectPosition: focusToCss(slide.focus) }}
                  onLoad={() => markLoaded(i)}
                  onError={() => markLoaded(i)}
                />
              ) : (
                <Image
                  src={resolvedSrc(slide.src)}
                  alt={i === index ? slide.alt : ""}
                  fill
                  loading="eager"
                  priority={priority && i === 0}
                  className={`object-contain object-center ${imageClassName}`}
                  style={{ objectPosition: focusToCss(slide.focus) }}
                  sizes="(max-width: 767px) 100vw, 50vw"
                  onLoadingComplete={() => markLoaded(i)}
                  onError={() => markLoaded(i)}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { LANDING_SLIDES };
