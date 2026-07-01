import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.05em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        success: "border-transparent bg-success text-success-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
