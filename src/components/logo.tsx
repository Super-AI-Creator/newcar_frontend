import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Merged with default image sizing (override per placement, e.g. footer uses `imageClassName`). */
  imageClassName?: string;
  variant?: "light" | "dark";
};

export default function Logo({ className, imageClassName, variant: _variant = "dark" }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="NewCarSuperstore platform logo"
        className={cn("h-10 w-auto sm:h-11", imageClassName)}
        loading="lazy"
      />
    </div>
  );
}
