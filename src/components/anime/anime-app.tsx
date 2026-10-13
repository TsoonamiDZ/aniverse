"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { HomeView } from "./home-view";
import { AnimeDetailView } from "./anime-detail-view";
import { WatchView } from "./watch-view";
import type { SortKey } from "@/lib/anime-types";

const VALID_SORTS: SortKey[] = ["recent", "popular", "episodes", "rating", "title", "shuffle"];

export function AnimeApp() {
  const sp = useSearchParams();

  const watch = sp.get("watch");
  const anime = sp.get("anime");
  const q = sp.get("q") ?? "";
  const sortRaw = sp.get("sort") as SortKey | null;
  const sort: SortKey = sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : "recent";
  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  // Decide the active view.
  const view = watch
    ? { kind: "watch" as const, key: watch }
    : anime
    ? { kind: "anime" as const, key: anime }
    : { kind: "home" as const, key: `home:${q}:${sort}:${page}` };

  // Scroll to top whenever the view changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.kind, view.kind === "watch" ? watch : view.kind === "anime" ? anime : view.key]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {view.kind === "watch" ? (
          <WatchView episodeId={decodeURIComponent(view.key)} />
        ) : view.kind === "anime" ? (
          <AnimeDetailView slug={decodeURIComponent(view.key)} />
        ) : (
          <HomeView page={page} sort={sort} q={q} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
