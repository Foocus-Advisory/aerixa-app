import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-[0.01em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border border-emerald-200 bg-emerald-100 text-emerald-900 shadow-sm dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:text-emerald-50",
        warning: "border border-amber-200 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-50",
        danger: "border border-rose-200 bg-rose-100 text-rose-900 shadow-sm dark:border-rose-500/45 dark:bg-rose-500/20 dark:text-rose-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
