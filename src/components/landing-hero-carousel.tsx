"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LANDING_SLIDES = [
  { src: "/images/landing_img (1).jpg", alt: "New car delivery" },
  { src: "/images/landing_img (2).jpg", alt: "New car ready for delivery" },
  { src: "/images/landing_img (3).jpg", alt: "Car with red bow" },
  { src: "/images/landing_img (4).jpg", alt: "Home delivery" }
];

const ROTATE_MS = 5000;

type Props = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function LandingHeroCarousel({ className = "", imageClassName = "", priority = false }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LANDING_SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {LANDING_SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt={i === index ? slide.alt : ""}
            fill
            priority={priority && i === 0}
            className={`object-cover object-center ${imageClassName}`}
            sizes="100vw"
          />
        </div>
      ))}
    </div>
  );
}

export { LANDING_SLIDES };
