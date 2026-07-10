"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_PATHS = {
  full: {
    onLight: "/img/Logo_AERIXA_black.png",
    onDark: "/img/Logo_AERIXA_light.png",
  },
  admin: "/img/Monogramme_AERIXA.png",
} as const;

export type BrandLogoVariant = "full" | "admin";

const LOGO_DIMENSIONS = {
  // Ratio réel des assets AERIXA (wordmark horizontal).
  full: { width: 21334, height: 12000 },
  admin: { width: 160, height: 217 },
} as const;

// Wordmark : dimensionner par la largeur, pas la hauteur.
export const AUTH_LOGO_CLASS = "mx-auto block w-[min(100%,16rem)] h-auto";

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
  return theme === "dark" ? LOGO_PATHS.full.onDark : LOGO_PATHS.full.onLight;
}

export function BrandLogo({
  variant = "full",
  className,
  width,
  height,
  priority = false,
}: BrandLogoProps) {
  const dims = LOGO_DIMENSIONS[variant === "admin" ? "admin" : "full"];
  const imageWidth = width ?? dims.width;
  const imageHeight = height ?? dims.height;
  const imageClassName = cn("object-contain", className);

  if (variant === "admin") {
    return (
      <Image
        src={LOGO_PATHS.admin}
        alt="AERIXA"
        width={imageWidth}
        height={imageHeight}
        sizes="40px"
        className={imageClassName}
        priority={priority}
        unoptimized
      />
    );
  }

  const sharedImageProps = {
    alt: "AERIXA",
    width: imageWidth,
    height: imageHeight,
    sizes: "(max-width: 768px) 90vw, 16rem" as const,
    className: imageClassName,
    priority,
    unoptimized: true,
  };

  return (
    <>
      <Image
        src={LOGO_PATHS.full.onLight}
        {...sharedImageProps}
        className={cn(imageClassName, "dark:hidden")}
      />
      <Image
        src={LOGO_PATHS.full.onDark}
        {...sharedImageProps}
        className={cn(imageClassName, "hidden dark:block")}
      />
    </>
  );
}
