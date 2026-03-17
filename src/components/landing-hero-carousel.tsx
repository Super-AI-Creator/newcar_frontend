"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LANDING_SLIDES = [
  { src: "/images/landing_img (1).jpg", alt: "New car delivery", focus: "center" },
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
  const slides = (slidesProp?.length ? slidesProp : LANDING_SLIDES) as Slide[];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const isExternal = (src: string) => src.startsWith("http://") || src.startsWith("https://");

  const focusToCss = (focus?: string) => {
    const v = (focus ?? "center").toLowerCase();
    if (v === "top") return "50% 0%";
    if (v === "bottom") return "50% 100%";
    if (v === "left") return "0% 50%";
    if (v === "right") return "100% 50%";
    return "50% 50%";
  };

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          {isExternal(slide.src) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.src}
              alt={i === index ? slide.alt : ""}
              className={`absolute inset-0 h-full w-full object-cover object-center ${imageClassName}`}
              style={{ objectPosition: focusToCss(slide.focus) }}
            />
          ) : (
            <Image
              src={slide.src}
              alt={i === index ? slide.alt : ""}
              fill
              priority={priority && i === 0}
              className={`object-cover object-center ${imageClassName}`}
              style={{ objectPosition: focusToCss(slide.focus) }}
              sizes="100vw"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export { LANDING_SLIDES };
