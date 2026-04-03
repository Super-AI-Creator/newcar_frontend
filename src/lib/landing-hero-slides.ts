/** DB may still store old hero slide paths; map them to files in `public/images/`. */
const LEGACY_HERO_SLIDE_URL_MAP: Record<string, string> = {
  "/images/landing_img (1).jpg": "/images/landing-1.jpg",
  "/images/landing_img (2).jpg": "/images/landing-2.jpg",
  "/images/landing_img (3).jpg": "/images/landing-3.jpg",
  "/images/landing_img (4).jpg": "/images/landing-4.jpg",
  "/images/landing-img (1).png": "/images/landing-1.jpg",
  "/images/landing-img (2).png": "/images/landing-2.jpg",
  "/images/landing-img (3).png": "/images/landing-3.jpg",
  "/images/landing-img (4).png": "/images/landing-4.jpg",
};

export function normalizeLegacyPublicImageUrl(src: string): string {
  const u = src.trim();
  return LEGACY_HERO_SLIDE_URL_MAP[u] ?? u;
}

/** @deprecated alias — same as normalizeLegacyPublicImageUrl */
export const normalizeHeroSlideUrl = normalizeLegacyPublicImageUrl;
