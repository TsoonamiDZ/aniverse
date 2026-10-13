"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, Sparkles, X } from "lucide-react";
import { AnimeCard } from "./anime-card";
import { Hero } from "./hero";
import { Pagination } from "./pagination";
import { RecentEpisodesStrip } from "./recent-episodes-strip";
import { AnimeGridSkeleton, HeroSkeleton } from "./skeletons";
import {
  SORT_LABELS,
  type AnimeListResponse,
  type AnimeListItem,
  type RecentEpisode,
  type SortKey,
} from "@/lib/anime-types";
import type { HomeFilters } from "./anime-app";

const PAGE_SIZE = 24;

async function fetchList(
  page: number,
  sort: SortKey,
  q: string,
  filters: HomeFilters
): Promise<AnimeListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort,
  });
  if (q) params.set("q", q);
  if (filters.airing) params.set("airing", "1");
  if (filters.type) params.set("type", filters.type);
  if (filters.season) params.set("season", filters.season);
  if (filters.year != null) params.set("year", String(filters.year));
  if (filters.genre) params.set("genre", filters.genre);
  const r = await fetch(`/api/anime?${params.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("anime list failed");
  return r.json();
}

async function fetchHero(): Promise<AnimeListResponse> {
  const r = await fetch("/api/anime?sort=popular&pageSize=8", { cache: "no-store" });
  if (!r.ok) throw new Error("hero failed");
  return r.json();
}

async function fetchRecentEpisodes(): Promise<RecentEpisode[]> {
  const r = await fetch("/api/recent/episodes?limit=16", { cache: "no-store" });
  if (!r.ok) throw new Error("recent episodes failed");
  return r.json();
}

async function fetchRecentAnime(): Promise<{ items: AnimeListItem[] }> {
  const r = await fetch("/api/recent/anime?limit=12", { cache: "no-store" });
  if (!r.ok) throw new Error("recent anime failed");
  return r.json();
}

async function fetchGenres(): Promise<{ items: { genre: string; label: string; count: number }[] }> {
  const r = await fetch("/api/genres", { cache: "no-store" });
  if (!r.ok) throw new Error("genres failed");
  return r.json();
}

const SEASON_AR: Record<string, string> = {
  WINTER: "الشتاء",
  SPRING: "الربيع",
  SUMMER: "الصيف",
  FALL: "الخريف",
};

const TYPE_AR: Record<string, string> = {
  TV: "أنمي (TV)",
  MOVIE: "أفلام",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "حلقات خاصة",
  MUSIC: "موسيقى",
  TV_SHORT: "TV قصير",
};

interface HomeViewProps {
  page: number;
  sort: SortKey;
  q: string;
  filters: HomeFilters;
}

export function HomeView({ page, sort, q, filters }: HomeViewProps) {
  const isSearching = q.trim().length > 0;
  const hasFilters =
    filters.airing || filters.type || filters.season || filters.year != null || filters.genre;
  const isDefaultBrowse = !isSearching && !hasFilters && sort === "recent" && page === 1;

  const list = useQuery({
    queryKey: ["anime-list", page, sort, q, filters],
    queryFn: () => fetchList(page, sort, q, filters),
  });

  const hero = useQuery({
    queryKey: ["anime-hero"],
    queryFn: fetchHero,
    enabled: isDefaultBrowse,
    staleTime: 10 * 60 * 1000,
  });

  const recentEpisodes = useQuery({
    queryKey: ["recent-episodes"],
    queryFn: fetchRecentEpisodes,
    enabled: isDefaultBrowse,
    staleTime: 0, // always refetch on mount so it reflects the latest sync
    refetchOnMount: true,
  });

  const recentAnime = useQuery({
    queryKey: ["recent-anime"],
    queryFn: fetchRecentAnime,
    enabled: isDefaultBrowse,
    staleTime: 0,
    refetchOnMount: true,
  });

  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: fetchGenres,
    staleTime: 5 * 60 * 1000,
  });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.airing) params.set("airing", "1");
    if (filters.type) params.set("type", filters.type);
    if (filters.season) params.set("season", filters.season);
    if (filters.year != null) params.set("year", String(filters.year));
    if (filters.genre) params.set("genre", filters.genre);
    params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const sorts: SortKey[] = ["recent", "popular", "episodes", "rating", "title", "shuffle"];

  // Active-filter chips (click to remove).
  const filterChips: { label: string; href: string }[] = [];
  const baseParams = () => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("sort", sort);
    return p;
  };
  if (filters.airing) {
    const p = baseParams();
    if (filters.type) p.set("type", filters.type);
    if (filters.season) p.set("season", filters.season);
    if (filters.year != null) p.set("year", String(filters.year));
    if (filters.genre) p.set("genre", filters.genre);
    filterChips.push({ label: "عرض الآن", href: `/?${p.toString()}` });
  }
  if (filters.type) {
    const p = baseParams();
    if (filters.airing) p.set("airing", "1");
    if (filters.season) p.set("season", filters.season);
    if (filters.year != null) p.set("year", String(filters.year));
    if (filters.genre) p.set("genre", filters.genre);
    filterChips.push({ label: TYPE_AR[filters.type] || filters.type, href: `/?${p.toString()}` });
  }
  if (filters.season) {
    const p = baseParams();
    if (filters.airing) p.set("airing", "1");
    if (filters.type) p.set("type", filters.type);
    if (filters.genre) p.set("genre", filters.genre);
    filterChips.push({
      label: `موسم ${SEASON_AR[filters.season] || filters.season}${filters.year ? " " + filters.year : ""}`,
      href: `/?${p.toString()}`,
    });
  }
  if (filters.genre) {
    const p = baseParams();
    if (filters.airing) p.set("airing", "1");
    if (filters.type) p.set("type", filters.type);
    if (filters.season) p.set("season", filters.season);
    if (filters.year != null) p.set("year", String(filters.year));
    filterChips.push({ label: filters.genre, href: `/?${p.toString()}` });
  }

  const heading = hasFilters
    ? filters.genre
      ? `تصنيف: ${filters.genre}`
      : filters.type
      ? TYPE_AR[filters.type] || filters.type
      : filters.airing
      ? "عرض الآن"
      : filters.season
      ? `أنميات ${SEASON_AR[filters.season] || filters.season}${filters.year ? " " + filters.year : ""}`
      : "تصفّح المكتبة"
    : "تصفّح المكتبة";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero only on default browse */}
      {isDefaultBrowse && (
        <section className="mb-8">
          {hero.isLoading || !hero.data ? <HeroSkeleton /> : <Hero items={hero.data.items} />}
        </section>
      )}

      {/* Recent episodes strip (default browse only) */}
      {isDefaultBrowse && recentEpisodes.data && (
        <RecentEpisodesStrip episodes={recentEpisodes.data} />
      )}

      {/* Recent anime (default browse only) */}
      {isDefaultBrowse && recentAnime.data && recentAnime.data.items.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Clock className="h-5 w-5 text-primary" />
              أحدث الأنميات المضافة
            </h2>
            <Link href="/?sort=recent" className="text-xs text-primary hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {recentAnime.data.items.slice(0, 12).map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </section>
      )}

      {/* Genre chips row */}
      {genres.data && genres.data.items.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <span className="shrink-0 text-xs font-bold text-muted-foreground">تصنيفات:</span>
            {genres.data.items.slice(0, 18).map((g) => {
              const active = filters.genre === g.genre;
              const p = new URLSearchParams();
              if (filters.airing) p.set("airing", "1");
              if (filters.type) p.set("type", filters.type);
              if (filters.season) p.set("season", filters.season);
              if (filters.year != null) p.set("year", String(filters.year));
              p.set("genre", g.genre);
              p.set("sort", sort);
              return (
                <Link
                  key={g.genre}
                  href={`/?${p.toString()}`}
                  className={
                    active
                      ? "shrink-0 rounded-full bg-grad-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                      : "shrink-0 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-foreground/70 hover:border-primary/50 hover:text-foreground"
                  }
                >
                  {g.label}
                  <span className="mr-1 text-[10px] opacity-60" dir="ltr">
                    {g.count.toLocaleString("en-US")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filterChips.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              <X className="h-3 w-3" />
              {c.label}
            </Link>
          ))}
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            مسح الكل
          </Link>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isSearching ? (
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Search className="h-5 w-5 text-primary" />
              نتائج البحث عن:
              <span className="text-primary" dir="ltr">
                «{q}»
              </span>
            </h1>
          ) : (
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              {heading}
            </h1>
          )}
          {!list.isLoading && list.data && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {list.data.total.toLocaleString("en-US")} أنمي · صفحة{" "}
              {page.toLocaleString("en-US")} من {list.data.totalPages.toLocaleString("en-US")}
            </p>
          )}
        </div>

        {!isSearching && (
          <div className="flex flex-wrap items-center gap-1.5">
            {sorts.map((s) => {
              const active = s === sort;
              const p = new URLSearchParams();
              if (filters.airing) p.set("airing", "1");
              if (filters.type) p.set("type", filters.type);
              if (filters.season) p.set("season", filters.season);
              if (filters.year != null) p.set("year", String(filters.year));
              if (filters.genre) p.set("genre", filters.genre);
              p.set("sort", s);
              return (
                <Link
                  key={s}
                  href={`/?${p.toString()}`}
                  className={
                    active
                      ? "rounded-full bg-grad-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/30"
                      : "rounded-full border border-border/60 bg-card/40 px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/50 hover:text-foreground"
                  }
                >
                  {SORT_LABELS[s]}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid */}
      {list.isLoading ? (
        <AnimeGridSkeleton />
      ) : list.isError || !list.data ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
          تعذّر تحميل القائمة. حاول مرة أخرى.
        </div>
      ) : list.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
          لا توجد نتائج مطابقة. جرّب كلمة بحث أخرى.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {list.data.items.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={list.data.totalPages}
            hrefForPage={hrefForPage}
          />
        </>
      )}
    </div>
  );
}
