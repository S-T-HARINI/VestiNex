import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
        secondary: "border border-slate-700 bg-slate-800/60 text-slate-300",
        destructive: "border border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border border-slate-700 text-slate-400",
        // Semantic Observability Badges
        critical: "border border-red-500/40 bg-red-950/40 text-red-400 font-semibold",
        high: "border border-orange-500/40 bg-orange-950/40 text-orange-400",
        medium: "border border-amber-500/40 bg-amber-950/40 text-amber-300",
        low: "border border-slate-600 bg-slate-800 text-slate-300",
        success: "border border-emerald-500/40 bg-emerald-950/40 text-emerald-400",
        running: "border border-cyan-500/40 bg-cyan-950/40 text-cyan-400 animate-pulse",
        rolled_back: "border border-purple-500/40 bg-purple-950/40 text-purple-300",
        delayed: "border border-amber-500/50 bg-amber-950/50 text-amber-300 font-mono text-[11px]",
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
