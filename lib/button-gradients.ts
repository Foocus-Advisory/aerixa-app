export const gradientButtonClasses = {
  primary:
    "bg-linear-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-95 dark:from-violet-500 dark:to-cyan-400",
  info:
    "bg-linear-to-r from-sky-500 to-blue-600 text-white hover:opacity-95 dark:from-sky-500 dark:to-blue-500",
  warning:
    "bg-linear-to-r from-amber-500 to-orange-600 text-white hover:opacity-95 dark:from-amber-500 dark:to-orange-500",
  destructive:
    "bg-linear-to-r from-rose-500 to-red-600 text-white hover:opacity-95 dark:from-rose-500 dark:to-red-500",
} as const;

export type GradientButtonVariant = keyof typeof gradientButtonClasses;

export function getGradientButtonClass(variant: GradientButtonVariant): string {
  return gradientButtonClasses[variant];
}
