import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-luxe-soft hover:from-brand-500 hover:to-brand-600 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
        secondary: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 motion-safe:hover:-translate-y-0.5",
        outline: "border border-ink-200 bg-white/95 text-ink-800 shadow-sm hover:bg-luxury-pearl hover:border-ink-300",
        ghost: "text-ink-700 hover:bg-ink-100/80"
      },
      size: {
        default: "h-11 px-6",
        sm: "h-10 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
