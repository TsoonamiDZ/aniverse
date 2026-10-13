"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { PosterImage } from "./poster-image";
import { cn } from "@/lib/utils";
import type { AnimeEpisodeRef } from "@/lib/anime-types";

interface EpisodeCardProps {
  episode: AnimeEpisodeRef;
  animeSlug: string;
  active?: boolean;
}

export function EpisodeCard({ episode, animeSlug, active }: EpisodeCardProps) {
  return (
    <Link
      href={`/?watch=${encodeURIComponent(episode.id)}`}
      className="group block focus:outline-none"
      prefetch={false}
      scroll={false}
    >
      <article
        className={cn(
          "relative flex gap-3 rounded-lg border p-2 transition-all duration-200 hover:border-primary/60 hover:bg-accent/40",
          active
            ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
            : "border-border/50 bg-card/40"
        )}
      >
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md">
          <PosterImage
            src={episode.posterUrl}
            alt={episode.title}
            className="h-full w-full"
          >
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </PosterImage>
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
            الحلقة {episode.episodeNumber}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="text-xs font-medium text-primary">حلقة {episode.episodeNumber}</span>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {episode.title}
          </p>
        </div>
        {active && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <Play className="h-2.5 w-2.5 fill-current" />
            تشغيل
          </span>
        )}
      </article>
    </Link>
  );
}
