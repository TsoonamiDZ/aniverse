"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, Loader2 } from "lucide-react";
import { PosterImage } from "./poster-image";
import { formatScore, scoreTier } from "@/lib/anime-format";
import type { AnimeListResponse } from "@/lib/anime-types";

async function fetchTopRated(): Promise<AnimeListResponse> {
  const r = await fetch("/api/anime?sort=rating&pageSize=10", { cache: "no-store" });
  if (!r.ok) throw new Error("top-rated failed");
  return r.json();
}

const TIER_TEXT: Record<string, string> = {
  high: "text-emerald-400",
  mid: "text-amber-400",
  low: "text-rose-400",
};

/** Right sidebar: "Top rated" list (rank + poster + title + score). */
export function HomeSidebar() {
  const q = useQuery({
    queryKey: ["sidebar-top-rated"],
    queryFn: fetchTopRated,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50">
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">الأعلى تقييماً</h3>
        </div>
        {q.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : q.isError || !q.data ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">تعذّر التحميل</p>
        ) : (
          <ol className="divide-y divide-border/30">
            {q.data.items.map((a, i) => {
              const tier = scoreTier(a.score);
              const scoreStr = formatScore(a.score);
              return (
                <li key={a.id}>
                  <Link
                    href={`/?anime=${encodeURIComponent(a.slug)}`}
                    className="flex items-center gap-2.5 p-2 transition hover:bg-accent/30"
                    prefetch={false}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-muted text-xs font-black text-muted-foreground">
                      {(i + 1).toLocaleString("en-US")}
                    </span>
                    <div className="aspect-[2/3] w-8 shrink-0 overflow-hidden rounded">
                      <PosterImage
                        src={a.coverImage || a.posterUrl || ""}
                        alt={a.titleEnglish || a.title}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="line-clamp-1 text-xs font-semibold leading-tight">
                        {a.titleEnglish || a.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {a.airedYear && <span dir="ltr">{a.airedYear}</span>}
                        {a.airedYear && a.score != null && <span>·</span>}
                        {scoreStr && (
                          <span className={`flex items-center gap-0.5 font-bold ${TIER_TEXT[tier]}`}>
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {scoreStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
