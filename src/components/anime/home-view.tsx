"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AnimeCard } from "./anime-card";
import { Hero } from "./hero";
import { Pagination } from "./pagination";
import { AnimeGridSkeleton, HeroSkeleton } from "./skeletons";
import { SORT_LABELS, type AnimeListResponse, type SortKey } from "@/lib/anime-types";

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

interface HomeViewProps {
  page: number;
  sort: SortKey;
  q: string;
}

export function HomeView({ page, sort, q }: HomeViewProps) {
  const isSearching = q.trim().length > 0;

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

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const sorts: SortKey[] = ["popular", "episodes", "title", "shuffle"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero only on default browse */}
      {!isSearching && (
        <section className="mb-8">
          {hero.isLoading || !hero.data ? <HeroSkeleton /> : <Hero items={hero.data.items} />}
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
            <h1 className="text-xl font-bold">تصفّح المكتبة</h1>
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
