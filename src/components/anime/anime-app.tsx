"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { SiteHeader } from "./site-header";
import { TopNav } from "./top-nav";
import { SiteFooter } from "./site-footer";
import { HomeView } from "./home-view";
import { AnimeDetailView } from "./anime-detail-view";
import { WatchView } from "./watch-view";
import { ScheduleView } from "./schedule-view";
import type { SortKey } from "@/lib/anime-types";

const VALID_SORTS: SortKey[] = ["recent", "popular", "episodes", "rating", "title", "shuffle"];

export interface HomeFilters {
  airing: boolean;
  type: string | null;
  season: string | null;
  year: number | null;
  genre: string | null;
}

export function AnimeApp() {
  const sp = useSearchParams();

  const watch = sp.get("watch");
  const anime = sp.get("anime");
  const q = sp.get("q") ?? "";
  const sortRaw = sp.get("sort") as SortKey | null;
  const sort: SortKey = sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : "recent";
  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const isSchedule = sp.get("view") === "schedule";
  const isLibrary = sp.get("view") === "library";

  const filters: HomeFilters = {
    airing: sp.get("airing") === "1" || sp.get("airing") === "true",
    type: sp.get("type"),
    season: sp.get("season"),
    year: sp.get("year") ? parseInt(sp.get("year")!, 10) : null,
    genre: sp.get("genre"),
  };

  // Decide the active view.
  const view = watch
    ? { kind: "watch" as const, key: watch }
    : anime
    ? { kind: "anime" as const, key: anime }
    : isSchedule
    ? { kind: "schedule" as const, key: "schedule" }
    : {
        kind: "home" as const,
        key: `home:${q}:${sort}:${page}:${filters.airing}:${filters.type}:${filters.season}:${filters.year}:${filters.genre}`,
      };

  // Scroll to top whenever the view changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.kind, view.key]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {!watch && !anime ? <TopNav /> : null}
      <main className="flex-1">
        {view.kind === "watch" ? (
          <WatchView episodeId={decodeURIComponent(view.key)} />
        ) : view.kind === "anime" ? (
          <AnimeDetailView slug={decodeURIComponent(view.key)} />
        ) : view.kind === "schedule" ? (
          <ScheduleView />
        ) : (
          <HomeView page={page} sort={sort} q={q} filters={filters} libraryMode={isLibrary} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
