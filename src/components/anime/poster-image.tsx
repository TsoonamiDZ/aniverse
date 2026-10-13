"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PosterImageProps {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Poster image with graceful fallback: if the remote image fails to load,
 * shows a flat solid primary placeholder with the title initial.
 * No gradients — flat surfaces only.
 */
export function PosterImage({ src, alt, className, children }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center bg-primary text-primary-foreground/90",
          className
        )}
        aria-label={alt}
        role="img"
      >
        <span className="text-4xl font-black opacity-70 select-none">
          {alt?.trim()?.charAt(0)?.toUpperCase() || "؟"}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
      />
      {children}
    </div>
  );
}
