"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

const LANDING_SLIDES = [
  { src: "/images/panel-cars.jpg", alt: "New car delivery", focus: "center" },
  { src: "/images/landing_img (2).jpg", alt: "New car ready for delivery", focus: "center" },
  { src: "/images/landing_img (3).jpg", alt: "Car with red bow", focus: "center" },
  { src: "/images/landing_img (4).jpg", alt: "Home delivery", focus: "center" }
];

const ROTATE_MS = 5000;

type Slide = { src: string; alt: string; focus?: string };

type Props = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  slides?: Slide[];
};

export default function LandingHeroCarousel({ className = "", imageClassName = "", priority = false, slides: slidesProp }: Props) {
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

  const isExternal = (src: string) => src.startsWith("http://") || src.startsWith("https://");

  const focusToCss = (focus?: string) => {
    const v = (focus ?? "center").toLowerCase();
    // if (v === "top") return "0% 0%";
    // if (v === "bottom") return "0% 0%";
    // if (v === "left") return "0% 0%";
    // if (v === "right") return "0% 0%";
    return "100% 100%";
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
                  src={slide.src}
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
                  src={slide.src}
                  alt={i === index ? slide.alt : ""}
                  fill
                  loading="eager"
                  priority={priority && i === 0}
                  className={`object-contain object-center ${imageClassName}`}
                  style={{ objectPosition: focusToCss(slide.focus) }}
                  sizes="100vw"
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
