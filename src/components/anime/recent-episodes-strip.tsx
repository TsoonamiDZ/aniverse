"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { PosterImage } from "./poster-image";
import type { RecentEpisode } from "@/lib/anime-types";

/** Horizontal scroll strip of recent episodes (poster + episode number + title). */
export function RecentEpisodesStrip({ episodes }: { episodes: RecentEpisode[] }) {
  if (!episodes.length) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-5 w-1.5 rounded-full bg-grad-primary" />
          أحدث الحلقات المضافة
        </h2>
        <span className="text-xs text-muted-foreground">آخر ما أُضيف إلى المكتبة</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {episodes.map((e) => (
          <Link
            key={e.id}
            href={`/?watch=${encodeURIComponent(e.id)}`}
            className="group block focus:outline-none"
            prefetch={false}
            scroll={false}
          >
            <article className="overflow-hidden rounded-lg border border-border/50 bg-card/50 transition hover:border-primary/50">
              <div className="relative aspect-video w-full">
                <PosterImage src={e.posterUrl} alt={e.animeTitle} className="h-full w-full">
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                    حلقة {e.episodeNumber}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <Play className="h-7 w-7 fill-white text-white" />
                  </span>
                </PosterImage>
              </div>
              <div className="p-2">
                <p className="line-clamp-1 text-xs font-bold leading-snug">{e.animeTitle}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">
                  {e.lastModified ? new Date(e.lastModified).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
