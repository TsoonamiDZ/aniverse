"use client";

import { cn } from "@/lib/utils";

export function HeroSkeleton() {
  return (
    <div className="relative h-[460px] overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="absolute inset-0 animate-pulse bg-muted" />
      <div className="relative z-10 flex h-full items-center gap-6 p-8">
        <div className="hidden aspect-[2/3] w-48 animate-pulse rounded-xl bg-muted sm:block" />
        <div className="flex-1 space-y-4">
          <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
          <div className="h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
          <div className="flex gap-2">
            <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-2.5">
            <div className="h-11 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-11 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnimeGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border/60 bg-card/40"
        >
          <div className="aspect-[2/3] w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-2.5">
            <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EpisodeGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-lg border border-border/50 bg-card/40 p-2"
        >
          <div className="aspect-video w-28 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlayerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-border/60 bg-card/40",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
