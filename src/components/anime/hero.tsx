"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Star, Film, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrailerButton } from "./trailer-dialog";
import {
  formatScore,
  scoreTier,
  typeLabel,
  splitList,
  pickPoster,
} from "@/lib/anime-format";
import type { AnimeListItem } from "@/lib/anime-types";

interface HeroProps {
  items: AnimeListItem[];
}

const TIER_TEXT: Record<string, string> = {
  high: "text-emerald-400",
  mid: "text-amber-400",
  low: "text-rose-400",
};

export function Hero({ items }: HeroProps) {
  const [idx, setIdx] = useState(0);
  const count = items.length;
  const safeIdx = count === 0 ? 0 : Math.min(idx, count - 1);

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 7000);
    return () => clearInterval(t);
  }, [count]);

  if (!count) return null;
  const current = items[safeIdx];
  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  const banner = current.bannerImage || current.coverImage || current.posterUrl;
  const poster = pickPoster(current.coverImage, current.posterUrl);
  const accent = current.coverColor || undefined;
  const scoreStr = formatScore(current.score);
  const tier = scoreTier(current.score);
  const genres = splitList(current.genresAr || current.genres).slice(0, 4);
  const type = typeLabel(current.animeType);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/50"
      aria-roledescription="carousel"
      aria-label="أنميات مميزة"
    >
      <div className="relative h-[480px] w-full sm:h-[520px]">
        {/* Cinematic wide banner backdrop */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {banner ? (
              <img
                src={banner}
                alt=""
                aria-hidden
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0";
                }}
              />
            ) : null}
            {/* Readability gradients */}
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/70 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/40" />
            {accent && (
              <div
                className="absolute inset-x-0 bottom-0 h-32 opacity-30"
                style={{
                  background: `linear-gradient(to top, ${accent}, transparent)`,
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 flex h-full items-center gap-8 p-5 sm:p-8 lg:p-12">
          {/* Poster */}
          <motion.div
            key={`poster-${current.id}`}
            initial={{ opacity: 0, y: 20, rotateY: -8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/60 sm:block md:w-48 lg:w-56"
          >
            <img
              src={poster}
              alt={current.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </motion.div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${current.id}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/40">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    مميّز الآن
                  </span>
                  {type && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                      {type}
                    </span>
                  )}
                  {current.airedYear && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15" dir="ltr">
                      {current.airedYear}
                    </span>
                  )}
                </div>

                <h2 className="text-3xl font-black leading-[1.1] text-foreground drop-shadow-lg text-balance sm:text-4xl lg:text-5xl">
                  {current.titleEnglish || current.title}
                </h2>
                {current.titleEnglish && current.title !== current.titleEnglish && (
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                    {current.title}
                  </p>
                )}

                {/* Score + meta row */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {scoreStr && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 ring-1 ring-white/10">
                      <Star className={`h-4 w-4 fill-current ${TIER_TEXT[tier]}`} />
                      <span className="text-lg font-black text-white" dir="ltr">{scoreStr}</span>
                      <span className="text-[11px] text-white/60">/ 10</span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    {current.episodeCount.toLocaleString("ar-EG")} حلقة
                  </span>
                </div>

                {/* Genres */}
                {genres.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-medium text-white/80 ring-1 ring-white/10"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Button asChild size="lg" className="h-11 bg-grad-primary text-primary-foreground shadow-lg shadow-primary/40 hover:opacity-90">
                    <Link href={`/?anime=${encodeURIComponent(current.slug)}`}>
                      <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                      شاهد الآن
                    </Link>
                  </Button>
                  <TrailerButton youtubeId={current.trailerYoutubeId} title={current.titleEnglish || current.title} />
                  <Button asChild size="lg" variant="secondary" className="h-11 bg-white/10 text-white hover:bg-white/20">
                    <Link href={`/?anime=${encodeURIComponent(current.slug)}`}>
                      التفاصيل
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/80"
              aria-label="السابق"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/80"
              aria-label="التالي"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`اذهب إلى ${it.title}`}
                  className={
                    i === safeIdx
                      ? "h-2 w-7 rounded-full bg-primary transition-all"
                      : "h-2 w-2 rounded-full bg-white/40 transition-all hover:bg-white/70"
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
