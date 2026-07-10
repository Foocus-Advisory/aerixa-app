"use client";

import Image from "next/image";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

const LOGO_PATHS = {
  full: {
    light: "/img/Logo_AERIXA_black.png",
    dark: "/img/Logo_AERIXA_light.png",
  },
  admin: "/img/Monogramme_AERIXA.png",
} as const;

export type BrandLogoVariant = "full" | "admin";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function getBrandLogoSrc(
  variant: BrandLogoVariant,
  theme: "light" | "dark",
): string {
  if (variant === "admin") return LOGO_PATHS.admin;
  return theme === "dark" ? LOGO_PATHS.full.dark : LOGO_PATHS.full.light;
}

export function BrandLogo({
  variant = "full",
  className,
  width,
  height,
  priority = false,
}: BrandLogoProps) {
  const theme = useDashboardStore((state) => state.theme);
  const src = getBrandLogoSrc(variant, theme);

  const defaultWidth = variant === "full" ? 280 : 40;
  const defaultHeight = variant === "full" ? 72 : 40;

  return (
    <Image
      src={src}
      alt="AERIXA"
      width={width ?? defaultWidth}
      height={height ?? defaultHeight}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
