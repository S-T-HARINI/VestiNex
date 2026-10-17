import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors select-none border",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-foreground",
        secondary: "border-border bg-background-secondary text-foreground-secondary",
        outline: "border-border text-foreground-secondary bg-transparent",
        primary: "border-primary/30 bg-primary/10 text-primary",

        // Semantic incident severities & statuses
        critical: "border-status-error-border bg-status-error-bg text-status-error-text font-semibold",
        destructive: "border-status-error-border bg-status-error-bg text-status-error-text",
        high: "border-status-warning-border bg-status-warning-bg text-status-warning-text font-semibold",
        medium: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
        low: "border-border bg-surface text-foreground-secondary",

        // Statuses
        success: "border-status-success-border bg-status-success-bg text-status-success-text font-medium",
        running: "border-status-info-border bg-status-info-bg text-status-info-text",
        rolled_back: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
        delayed: "border-status-warning-border bg-status-warning-bg text-status-warning-text font-mono",
        neutral: "border-status-neutral-border bg-status-neutral-bg text-status-neutral-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
