"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, Sparkles } from "lucide-react";
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

const PAGE_SIZE = 24;

async function fetchList(
  page: number,
  sort: SortKey,
  q: string
): Promise<AnimeListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort,
  });
  if (q) params.set("q", q);
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

interface HomeViewProps {
  page: number;
  sort: SortKey;
  q: string;
}

export function HomeView({ page, sort, q }: HomeViewProps) {
  const isSearching = q.trim().length > 0;
  const isDefaultBrowse = !isSearching && sort === "recent" && page === 1;

  const list = useQuery({
    queryKey: ["anime-list", page, sort, q],
    queryFn: () => fetchList(page, sort, q),
  });

  const hero = useQuery({
    queryKey: ["anime-hero"],
    queryFn: fetchHero,
    enabled: !isSearching,
    staleTime: 10 * 60 * 1000,
  });

  const recentEpisodes = useQuery({
    queryKey: ["recent-episodes"],
    queryFn: fetchRecentEpisodes,
    enabled: isDefaultBrowse,
    staleTime: 60 * 1000,
  });

  const recentAnime = useQuery({
    queryKey: ["recent-anime"],
    queryFn: fetchRecentAnime,
    enabled: isDefaultBrowse,
    staleTime: 60 * 1000,
  });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const sorts: SortKey[] = ["recent", "popular", "episodes", "rating", "title", "shuffle"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero only on default browse */}
      {!isSearching && (
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
              تصفّح المكتبة
            </h1>
          )}
          {!list.isLoading && list.data && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {list.data.total.toLocaleString("ar-EG")} أنمي · صفحة{" "}
              {page.toLocaleString("ar-EG")} من {list.data.totalPages.toLocaleString("ar-EG")}
            </p>
          )}
        </div>

        {!isSearching && (
          <div className="flex flex-wrap items-center gap-1.5">
            {sorts.map((s) => {
              const active = s === sort;
              const href = `/?sort=${s}`;
              return (
                <Link
                  key={s}
                  href={href}
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
