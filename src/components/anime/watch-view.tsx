"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ListVideo,
  Play,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./video-player";
import { SourceSelector } from "./source-selector";
import { EpisodeCard } from "./episode-card";
import { PlayerSkeleton } from "./skeletons";
import type {
  AnimeDetailResponse,
  EpisodeDetailResponse,
} from "@/lib/anime-types";

async function fetchEpisode(id: string): Promise<EpisodeDetailResponse> {
  const r = await fetch(`/api/episode/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error("episode failed");
  return r.json();
}

async function fetchAnimeDetail(slug: string): Promise<AnimeDetailResponse> {
  const r = await fetch(`/api/anime/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error("anime detail failed");
  return r.json();
}

export function WatchView({ episodeId }: { episodeId: string }) {
  const router = useRouter();

  const ep = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: () => fetchEpisode(episodeId),
  });

  const anime = useQuery({
    queryKey: ["anime-detail-watch", ep.data?.animeSlug],
    queryFn: () => fetchAnimeDetail(ep.data!.animeSlug),
    enabled: !!ep.data?.animeSlug,
    staleTime: 5 * 60 * 1000,
  });

  const sources = ep.data?.sources ?? [];
  // User's explicitly chosen source id (null = use the default best one).
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Derive the effective source: honor the user's choice if still valid,
  // otherwise fall back to the best (first) source. No effect needed.
  const selectedSource = useMemo(() => {
    if (selectedId !== null) {
      const found = sources.find((s) => s.id === selectedId);
      if (found) return found;
    }
    return sources[0] ?? null;
  }, [sources, selectedId]);

  // Scroll to top when switching episodes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [episodeId]);

  if (ep.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PlayerSkeleton className="aspect-video" />
      </div>
    );
  }

  if (ep.isError || !ep.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-3 text-lg font-bold">الحلقة غير موجودة</p>
        <Button className="mt-5" asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  const e = ep.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          الرئيسية
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link href={`/?anime=${encodeURIComponent(e.animeSlug)}`} className="hover:text-foreground line-clamp-1 max-w-[60vw]">
          {e.animeTitle}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">الحلقة {e.episodeNumber}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {selectedSource ? (
            <VideoPlayer source={selectedSource} />
          ) : (
            <PlayerSkeleton className="aspect-video" />
          )}

          {/* Episode header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight sm:text-xl">
                {e.animeTitle}
                <span className="mr-2 inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary align-middle">
                  الحلقة {e.episodeNumber}
                </span>
              </h1>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {e.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {e.prev ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/?watch=${encodeURIComponent(e.prev.id)}`} scroll={false}>
                    <ChevronRight className="h-4 w-4" />
                    السابقة
                  </Link>
                </Button>
              ) : (
                <Button variant="secondary" size="sm" disabled className="opacity-40">
                  <ChevronRight className="h-4 w-4" />
                  السابقة
                </Button>
              )}
              {e.next ? (
                <Button asChild size="sm" className="bg-grad-primary text-primary-foreground hover:opacity-90">
                  <Link href={`/?watch=${encodeURIComponent(e.next.id)}`} scroll={false}>
                    التالية
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" disabled className="opacity-40">
                  التالية
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sources */}
          <SourceSelector
            sources={sources}
            selectedId={selectedSource?.id ?? 0}
            onSelect={setSelectedId}
          />

          {/* Open source page fallback */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-card/30 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              لا يستضيف الموقع أي فيديو. التشغيل عبر مُضمّن المزوّد؛ إن لم يعمل المشغّل،
              جرّب مزوّدًا آخر أو افتح الرابط في نافذة جديدة.
            </span>
            <Button asChild size="sm" variant="outline" className="ml-auto h-7 text-xs">
              <a href={e.episodePageUrl} target="_blank" rel="noopener noreferrer">
                صفحة الحلقة الأصلية
              </a>
            </Button>
          </div>
        </div>

        {/* Sidebar: episode list */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <ListVideo className="h-4 w-4 text-primary" />
                حلقات {e.animeTitle}
              </h2>
              {e.animeSlug && (
                <Link
                  href={`/?anime=${encodeURIComponent(e.animeSlug)}`}
                  className="text-xs text-primary hover:underline"
                >
                  صفحة الأنمي
                </Link>
              )}
            </div>
            {anime.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg border border-border/40 bg-card/30 p-2"
                  >
                    <div className="aspect-video w-28 shrink-0 animate-pulse rounded-md bg-muted" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : anime.data ? (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin lg:max-h-[calc(100vh-180px)]">
                {anime.data.episodes.map((epi) => (
                  <EpisodeCard
                    key={epi.id}
                    episode={epi}
                    animeSlug={e.animeSlug}
                    active={epi.id === e.id}
                  />
                ))}
              </div>
            ) : (
              <p className="p-4 text-center text-xs text-muted-foreground">
                تعذّر تحميل قائمة الحلقات.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
