"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Radio,
  Film,
  Tv,
  CalendarDays,
  CalendarRange,
  Star,
  Shuffle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Compute the current anime season (AniList convention) + year from today. */
function currentSeason(): { season: string; year: number } {
  const d = new Date();
  const m = d.getMonth(); // 0-11
  const year = d.getFullYear();
  const season =
    m >= 2 && m <= 4
      ? "SPRING"
      : m >= 5 && m <= 7
      ? "SUMMER"
      : m >= 8 && m <= 10
      ? "FALL"
      : "WINTER";
  // Winter spans Dec→Jan; if December, the season is Winter of next year.
  return { season, year: m === 11 ? year + 1 : year };
}

const SEASON_AR: Record<string, string> = {
  WINTER: "الشتاء",
  SPRING: "الربيع",
  SUMMER: "الصيف",
  FALL: "الخريف",
};

const NAV = [
  { key: "airing", label: "عرض الآن", icon: Radio, href: "/?airing=1" },
  { key: "movies", label: "أفلام", icon: Film, href: "/?view=library&type=MOVIE" },
  { key: "anime", label: "أنمي", icon: Tv, href: "/?view=library" },
  { key: "season", label: "أنميات الموسم", icon: CalendarDays }, // href built dynamically
  { key: "schedule", label: "جدول البث", icon: CalendarRange, href: "/?view=schedule" },
  { key: "rating", label: "الأعلى تقييماً", icon: Star, href: "/?sort=rating" },
];

/** Secondary top navigation row (categories) — sits under the main header. */
export function TopNav() {
  const sp = useSearchParams();
  const router = useRouter();
  const [loadingRandom, setLoadingRandom] = useState(false);

  const { season, year } = currentSeason();
  const seasonHref = `/?season=${season}&year=${year}`;

  // Active link detection.
  const isActive = (key: string, _href: string) => {
    if (key === "airing") return sp.get("airing") === "1";
    if (key === "movies") return sp.get("view") === "library" && sp.get("type") === "MOVIE";
    if (key === "anime") return sp.get("view") === "library" && (!sp.get("type") || sp.get("type") === "TV");
    if (key === "season") return sp.get("season") === season && sp.get("year") === String(year);
    if (key === "schedule") return sp.get("view") === "schedule";
    if (key === "rating") return sp.get("sort") === "rating";
    return false;
  };

  const goRandom = async () => {
    setLoadingRandom(true);
    try {
      const r = await fetch("/api/anime/random", { cache: "no-store" });
      const data = await r.json();
      if (data.slug) router.push(`/?anime=${encodeURIComponent(data.slug)}`);
    } finally {
      setLoadingRandom(false);
    }
  };

  return (
    <nav className="sticky top-16 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-thin sm:px-6 lg:px-8">
        {NAV.map((item) => {
          const href = item.key === "season" ? seasonHref : item.href!;
          const Icon = item.icon;
          const label =
            item.key === "season"
              ? `${SEASON_AR[season]} ${year}`
              : item.label;
          const active = isActive(item.key, href);
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-grad-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-foreground/70 hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={goRandom}
          disabled={loadingRandom}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/50 hover:text-primary"
        >
          {loadingRandom ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shuffle className="h-3.5 w-3.5" />
          )}
          أنمي عشوائي
        </button>
      </div>
    </nav>
  );
}
