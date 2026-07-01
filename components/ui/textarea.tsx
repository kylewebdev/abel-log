import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "focus-ring flex min-h-24 w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
