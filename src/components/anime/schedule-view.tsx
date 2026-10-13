"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Radio, Clock, Loader2 } from "lucide-react";
import { PosterImage } from "./poster-image";
import { formatScore, pickPoster } from "@/lib/anime-format";

interface ScheduleItem {
  id: string;
  slug: string;
  title: string;
  titleEnglish: string | null;
  coverImage: string | null;
  posterUrl: string | null;
  coverColor: string | null;
  nextEpisode: number | null;
  nextEpisodeAirAt: string | null;
  episodeCount: number;
  score: number | null;
}
interface ScheduleData {
  schedule: { day: string; items: ScheduleItem[] }[];
  upcoming: ScheduleItem[];
}

async function fetchSchedule(): Promise<ScheduleData> {
  const r = await fetch("/api/schedule", { cache: "no-store" });
  if (!r.ok) throw new Error("schedule failed");
  return r.json();
}

function fmtAir(at: string | null): string {
  if (!at) return "—";
  const t = new Date(at);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function ScheduleView() {
  const q = useQuery({
    queryKey: ["schedule"],
    queryFn: fetchSchedule,
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        تعذّر تحميل جدول البث.
      </div>
    );
  }

  const { schedule, upcoming } = q.data;
  const hasAny = schedule.some((d) => d.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <CalendarRange className="h-6 w-6 text-primary" />
          جدول البث
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الأنميات المعروضة حاليًا مرتّبة حسب موعد بث الحلقة القادمة.
        </p>
      </div>

      {/* Upcoming next (live "what's airing soon") */}
      {upcoming.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Radio className="h-5 w-5 text-primary" />
            قريبًا
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {upcoming.map((a) => (
              <Link
                key={a.id}
                href={`/?anime=${encodeURIComponent(a.slug)}`}
                className="group block w-40 shrink-0"
                prefetch={false}
              >
                <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50 transition hover:border-primary/50">
                  <div className="relative aspect-[2/3] w-full">
                    <PosterImage
                      src={pickPoster(a.coverImage, a.posterUrl)}
                      alt={a.titleEnglish || a.title}
                      className="h-full w-full"
                    >
                      {a.score != null && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          ★ {formatScore(a.score)}
                        </span>
                      )}
                    </PosterImage>
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-1 text-xs font-bold leading-snug">
                      {a.titleEnglish || a.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {fmtAir(a.nextEpisodeAirAt)} UTC
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Weekly grid */}
      {hasAny ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedule.map((day) => (
            <section
              key={day.day}
              className="rounded-xl border border-border/50 bg-card/40 p-3"
            >
              <h3 className="mb-2 flex items-center justify-between border-b border-border/40 pb-2 text-sm font-bold">
                <span className="flex items-center gap-1.5">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  {day.day}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {day.items.length.toLocaleString("en-US")}
                </span>
              </h3>
              {day.items.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">لا بث</p>
              ) : (
                <div className="space-y-1.5">
                  {day.items.map((a) => (
                    <Link
                      key={a.id}
                      href={`/?anime=${encodeURIComponent(a.slug)}`}
                      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 p-1.5 text-xs transition hover:border-primary/50"
                      prefetch={false}
                    >
                      <div className="aspect-[2/3] w-8 shrink-0 overflow-hidden rounded">
                        <PosterImage
                          src={pickPoster(a.coverImage, a.posterUrl)}
                          alt={a.titleEnglish || a.title}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold">
                          {a.titleEnglish || a.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {fmtAir(a.nextEpisodeAirAt)} UTC
                          {a.nextEpisode ? ` · EP${a.nextEpisode}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-muted-foreground">
          لا توجد أنميات تُعرض حاليًا بموعد بث معروف.
        </div>
      )}
    </div>
  );
}
