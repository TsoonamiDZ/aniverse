"use client";

import Link from "next/link";
import { Play, Layers } from "lucide-react";
import { PosterImage } from "./poster-image";
import type { AnimeListItem } from "@/lib/anime-types";

export function AnimeCard({ anime }: { anime: AnimeListItem }) {
  return (
    <Link
      href={`/?anime=${encodeURIComponent(anime.slug)}`}
      className="group block focus:outline-none"
      prefetch={false}
    >
      <article className="overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-sm transition-all duration-300 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
        <div className="relative aspect-[2/3] w-full">
          <PosterImage src={anime.posterUrl} alt={anime.title} className="h-full w-full">
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Layers className="h-3 w-3" />
              {anime.episodeCount} حلقة
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-lg shadow-primary/40">
                <Play className="h-5 w-5 translate-x-0.5 fill-current" />
              </span>
            </span>
          </PosterImage>
        </div>
        <div className="p-2.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {anime.title}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
            {anime.sourceCount} رابط مشاهدة
          </p>
        </div>
      </article>
    </Link>
  );
}
