import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "focus-ring flex min-h-12 w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
