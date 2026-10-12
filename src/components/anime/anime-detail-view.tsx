"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Layers, Link2, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosterImage } from "./poster-image";
import { EpisodeCard } from "./episode-card";
import { EpisodeGridSkeleton } from "./skeletons";
import type { AnimeDetailResponse } from "@/lib/anime-types";

async function fetchDetail(slug: string): Promise<AnimeDetailResponse> {
  const r = await fetch(`/api/anime/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error("anime detail failed");
  return r.json();
}

export function AnimeDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["anime-detail", slug],
    queryFn: () => fetchDetail(slug),
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="aspect-[2/3] w-44 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="mt-8">
          <EpisodeGridSkeleton />
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-bold">الأنمي غير موجود</p>
        <p className="mt-1 text-sm text-muted-foreground">
          ربما حُذف أو أن الرابط غير صحيح.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  const anime = q.data;
  const firstEpisode = anime.episodes[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>

      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div className="absolute inset-0">
          <PosterImage src={anime.posterUrl} alt="" className="h-full w-full opacity-30">
            <span className="absolute inset-0 bg-gradient-to-l from-card via-card/85 to-card/60" />
            <span className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </PosterImage>
        </div>
        <div className="relative z-10 flex flex-col gap-5 p-5 sm:flex-row sm:p-7 lg:p-9">
          <div className="mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/50 sm:mx-0 sm:w-48">
            <PosterImage src={anime.posterUrl} alt={anime.title} className="h-full w-full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-2xl font-black leading-tight text-foreground text-balance sm:text-3xl lg:text-4xl">
              {anime.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-black/50 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {anime.episodeCount.toLocaleString("ar-EG")} حلقة
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-black/50 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                {anime.sourceCount.toLocaleString("ar-EG")} رابط مشاهدة
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {firstEpisode && (
                <Button
                  asChild
                  size="lg"
                  className="bg-grad-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
                >
                  <Link
                    href={`/?watch=${encodeURIComponent(firstEpisode.id)}`}
                    scroll={false}
                  >
                    <Clapperboard className="h-4 w-4" />
                    مشاهدة الحلقة الأولى
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="secondary">
                <Link href={anime.pageUrl} target="_blank" rel="noopener noreferrer">
                  صفحة المصدر
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Episodes */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-5 w-5 text-primary" />
            الحلقات
            <span className="text-sm font-normal text-muted-foreground">
              ({anime.episodeCount.toLocaleString("ar-EG")})
            </span>
          </h2>
        </div>
        {anime.episodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
            لا توجد حلقات متاحة لهذا الأنمي.
          </div>
        ) : (
          <div className="grid max-h-[1100px] grid-cols-1 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2 lg:grid-cols-3">
            {anime.episodes.map((e) => (
              <EpisodeCard key={e.id} episode={e} animeSlug={anime.slug} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
