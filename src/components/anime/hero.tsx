"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Layers, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnimeListItem } from "@/lib/anime-types";

interface HeroProps {
  items: AnimeListItem[];
}

export function Hero({ items }: HeroProps) {
  const [idx, setIdx] = useState(0);
  const count = items.length;

  // Clamp index at render time (no effect) — items are stable per fetch.
  const safeIdx = count === 0 ? 0 : Math.min(idx, count - 1);

  // Auto-rotate.
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (!count) return null;
  const current = items[safeIdx];

  const go = (delta: number) =>
    setIdx((i) => (i + delta + count) % count);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/60"
      aria-roledescription="carousel"
      aria-label="أنميات مميزة"
    >
      <div className="relative h-[440px] w-full sm:h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Blurred backdrop */}
            <img
              src={current.posterUrl}
              alt=""
              aria-hidden
              className="h-full w-full scale-110 object-cover blur-2xl brightness-50"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/85 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 flex h-full items-center gap-6 p-5 sm:p-8 lg:p-10">
          <motion.div
            key={`poster-${current.id}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hidden aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/50 sm:block md:w-44 lg:w-48"
          >
            <img
              src={current.posterUrl}
              alt={current.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.style.display = "none";
              }}
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${current.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  مميّز الآن
                </span>
                <h2 className="mt-3 text-3xl font-black leading-tight text-foreground drop-shadow-md text-balance sm:text-4xl lg:text-5xl">
                  {current.title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    {current.episodeCount} حلقة
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    {current.sourceCount} رابط
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Button asChild size="lg" className="bg-grad-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
                    <Link href={`/?anime=${encodeURIComponent(current.slug)}`}>
                      <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                      شاهد الآن
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <Link href={`/?anime=${encodeURIComponent(current.slug)}`}>
                      تصفّح الحلقات
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
              className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/70"
              aria-label="السابق"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/70"
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
                      ? "h-2 w-6 rounded-full bg-primary transition-all"
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
