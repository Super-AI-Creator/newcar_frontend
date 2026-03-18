import { cn } from "@/lib/utils";

type LogoProps = { className?: string; variant?: "light" | "dark" };

export default function Logo({ className, variant = "dark" }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo.png" alt="NewCarSuperstore platform logo" className="h-7 w-auto sm:h-8" loading="lazy" />
    </div>
  );
}
