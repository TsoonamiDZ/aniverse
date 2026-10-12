"use client";

import Link from "next/link";
import { Play, Star, Tv } from "lucide-react";
import { PosterImage } from "./poster-image";
import { cn } from "@/lib/utils";
import {
  formatScore,
  scoreTier,
  typeLabel,
  pickPoster,
} from "@/lib/anime-format";
import type { AnimeListItem } from "@/lib/anime-types";

const TIER_CLASS: Record<string, string> = {
  high: "bg-emerald-500/90 text-white",
  mid: "bg-amber-500/90 text-white",
  low: "bg-rose-500/90 text-white",
};

export function AnimeCard({ anime }: { anime: AnimeListItem }) {
  const scoreStr = formatScore(anime.score);
  const tier = scoreTier(anime.score);
  const type = typeLabel(anime.animeType);
  const poster = pickPoster(anime.coverImage, anime.posterUrl);
  const accent = anime.coverColor || undefined;

  return (
    <Link
      href={`/?anime=${encodeURIComponent(anime.slug)}`}
      className="group block focus:outline-none"
      prefetch={false}
    >
      <article className="overflow-hidden rounded-xl border border-border/50 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40">
        <div className="relative aspect-[2/3] w-full">
          <PosterImage src={poster} alt={anime.title} className="h-full w-full">
            {/* Score badge */}
            {scoreStr && (
              <span
                className={cn(
                  "absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold shadow-md backdrop-blur",
                  TIER_CLASS[tier]
                )}
              >
                <Star className="h-3 w-3 fill-current" />
                {scoreStr}
              </span>
            )}
            {/* Type + year chip */}
            {(type || anime.airedYear) && (
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                {type && (
                  <>
                    <Tv className="h-2.5 w-2.5" />
                    {type}
                  </>
                )}
                {type && anime.airedYear && <span className="opacity-50">·</span>}
                {anime.airedYear && anime.airedYear}
              </span>
            )}
            {/* Hover play overlay */}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span
                className="grid h-12 w-12 place-items-center rounded-full text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: accent || "var(--primary)" }}
              >
                <Play className="h-5 w-5 translate-x-0.5 fill-current" />
              </span>
            </span>
            {/* Accent edge */}
            {accent && (
              <span
                className="absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ backgroundColor: accent }}
              />
            )}
          </PosterImage>
        </div>
        <div className="p-2.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {anime.titleEnglish || anime.title}
          </h3>
          {anime.titleEnglish && anime.title !== anime.titleEnglish && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground" dir="ltr">
              {anime.title}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {anime.episodeCount.toLocaleString("ar-EG")} حلقة
          </p>
        </div>
      </article>
    </Link>
  );
}
