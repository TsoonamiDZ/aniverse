"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Layers,
  Link2,
  Star,
  Users,
  Heart,
  TrendingUp,
  Calendar,
  Clock,
  Building2,
  Tag,
  Play,
  ExternalLink,
  Film,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosterImage } from "./poster-image";
import { EpisodeCard } from "./episode-card";
import { EpisodeGridSkeleton } from "./skeletons";
import { TrailerButton } from "./trailer-dialog";
import {
  formatScore,
  scoreTier,
  typeLabel,
  statusLabel,
  seasonLabel,
  splitList,
  formatNumber,
  pickPoster,
} from "@/lib/anime-format";
import type { AnimeDetailResponse } from "@/lib/anime-types";

async function fetchDetail(slug: string): Promise<AnimeDetailResponse> {
  const r = await fetch(`/api/anime/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!r.ok) throw new Error("anime detail failed");
  return r.json();
}

const TIER_TEXT: Record<string, string> = {
  high: "text-emerald-400",
  mid: "text-amber-400",
  low: "text-rose-400",
};

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
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
  const poster = pickPoster(anime.coverImage, anime.posterUrl);
  const banner = anime.bannerImage || poster;
  const accent = anime.coverColor || undefined;
  const scoreStr = formatScore(anime.score);
  const tier = scoreTier(anime.score);
  const genres = splitList(anime.genresAr || anime.genres);
  const tags = splitList(anime.tags).slice(0, 12);
  const synopsis = anime.synopsisAr || anime.synopsis;
  const studios = splitList(anime.studios);
  const type = typeLabel(anime.animeType);
  const status = statusLabel(anime.animeStatus);
  const season = seasonLabel(anime.season);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>

      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50">
        <div className="absolute inset-0">
          {banner && (
            <img
              src={banner}
              alt=""
              aria-hidden
              className="h-full w-full scale-105 object-cover blur-md brightness-50"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {/* Flat readability overlay (no gradient) */}
          <div className="absolute inset-0 bg-background/85" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 p-5 sm:flex-row sm:p-7 lg:p-9">
          <div className="mx-auto aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/60 sm:mx-0 sm:w-52">
            <PosterImage src={poster} alt={anime.title} className="h-full w-full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {type && (
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/40">
                  {type}
                </span>
              )}
              {status && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                  {status}
                </span>
              )}
              {anime.airedYear && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 ring-1 ring-white/15" dir="ltr">
                  {anime.airedYear}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight text-foreground text-balance sm:text-3xl lg:text-4xl">
              {anime.titleEnglish || anime.title}
            </h1>
            {anime.titleEnglish && anime.title !== anime.titleEnglish && (
              <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                {anime.titleRomaji || anime.title} · {anime.titleJapanese}
              </p>
            )}

            {/* Score + popularity row */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {scoreStr && (
                <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 ring-1 ring-white/10">
                  <Star className={`h-5 w-5 fill-current ${TIER_TEXT[tier]}`} />
                  <span className="text-2xl font-black text-white" dir="ltr">{scoreStr}</span>
                  <span className="text-xs text-white/60">/ 10</span>
                  <span className="ml-1 border-r border-white/15 pr-2 text-[11px] text-white/60" dir="ltr">
                    {formatNumber(anime.score ? Math.round(anime.popularity ?? 0) : 0)} تقييم
                  </span>
                </div>
              )}
              {anime.popularity != null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/10">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  {formatNumber(anime.popularity)} شعبية
                </span>
              )}
              {anime.favorites != null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/10">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                  {formatNumber(anime.favorites)}
                </span>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              {firstEpisode && (
                <Button
                  asChild
                  size="lg"
                  className="h-11 bg-grad-primary text-primary-foreground shadow-lg shadow-primary/40 hover:opacity-90"
                >
                  <Link href={`/?watch=${encodeURIComponent(firstEpisode.id)}`} scroll={false}>
                    <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                    مشاهدة الحلقة الأولى
                  </Link>
                </Button>
              )}
              <TrailerButton youtubeId={anime.trailerYoutubeId} title={anime.titleEnglish || anime.title} />
            </div>
          </div>
        </div>
      </section>

      {/* Info grid + Synopsis */}
      <section className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Info panel */}
        <aside className="rounded-xl border border-border/50 bg-card/40 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Info className="h-4 w-4 text-primary" />
            معلومات
          </h2>
          <div className="divide-y divide-border/40">
            {type && <MetaRow icon={Film} label="النوع">{type}</MetaRow>}
            {anime.animeSource && <MetaRow icon={Tag} label="المصدر">{anime.animeSource}</MetaRow>}
            {anime.episodeCount != null && (
              <MetaRow icon={Layers} label="عدد الحلقات">
                {anime.episodeCount.toLocaleString("en-US")} {anime.malEpisodes && anime.malEpisodes !== anime.episodeCount && (
                  <span className="text-muted-foreground" dir="ltr"> (MAL: {anime.malEpisodes})</span>
                )}
              </MetaRow>
            )}
            {anime.duration != null && (
              <MetaRow icon={Clock} label="المدة">{anime.duration} دقيقة/حلقة</MetaRow>
            )}
            {status && <MetaRow icon={Play} label="الحالة">{status}</MetaRow>}
            {anime.airedString && (
              <MetaRow icon={Calendar} label="بث">{anime.airedString}</MetaRow>
            )}
            {season && anime.airedYear && (
              <MetaRow icon={Calendar} label="موسم">{season} {anime.airedYear}</MetaRow>
            )}
            {studios.length > 0 && (
              <MetaRow icon={Building2} label="الاستوديو">{studios.join("، ")}</MetaRow>
            )}
            {anime.popularity != null && (
              <MetaRow icon={Users} label="الشعبية">{formatNumber(anime.popularity)}</MetaRow>
            )}
          </div>
          {(anime.anilistUrl || anime.malUrl) && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
              {anime.malUrl && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={anime.malUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    MyAnimeList
                  </a>
                </Button>
              )}
              {anime.anilistUrl && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={anime.anilistUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    AniList
                  </a>
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* Synopsis + tags */}
        <div className="min-w-0 space-y-5">
          {synopsis && (
            <div className="rounded-xl border border-border/50 bg-card/40 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Info className="h-4 w-4 text-primary" />
                القصة
              </h2>
              <p className="whitespace-pre-line text-sm leading-7 text-foreground/90">
                {synopsis}
              </p>
              {!anime.synopsisAr && anime.synopsis && (
                <p className="mt-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground/70">
                  ⓘ لا يتوفر ملخص عربي رسمي لهذا الأنمي بعد — المعروض أعلاه هو المصدر الإنجليزي من AniList.
                </p>
              )}
            </div>
          )}
          {tags.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card/40 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Tag className="h-4 w-4 text-primary" />
                الوسوم
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!anime.synopsis && !anime.tags && (
            <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
              المعلومات الوصفية لهذا الأنمي غير متوفرة بعد. جرّب تحديث المكتبة لاحقًا.
            </div>
          )}
        </div>
      </section>

      {/* Episodes */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-5 w-5 text-primary" />
            الحلقات
            <span className="text-sm font-normal text-muted-foreground">
              ({anime.episodeCount.toLocaleString("en-US")})
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
