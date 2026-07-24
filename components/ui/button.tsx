"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[transform,background-color,box-shadow,color] duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-button hover:bg-primary/90 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:shadow-none",
        accent:
          "bg-accent text-accent-foreground shadow-stamp hover:brightness-[1.04] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-button hover:bg-destructive/90 active:shadow-none",
        outline:
          "border border-input bg-card text-foreground shadow-sm hover:bg-muted/70 active:shadow-none",
        ghost: "text-foreground hover:bg-muted/80 active:bg-muted",
        link: "min-h-fit p-0 text-accent underline-offset-4 hover:underline active:translate-y-0"
      },
      size: {
        default: "min-h-11 px-4 py-2 text-sm",
        sm: "min-h-10 px-3 text-sm",
        lg: "min-h-14 px-5 text-base",
        xl: "min-h-16 px-6 text-lg font-bold",
        icon: "size-11 p-0"
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
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
