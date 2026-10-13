"use client";

import { useMemo } from "react";
import { Tv, Check } from "lucide-react";
import { providerLabel } from "@/lib/anime-helpers";
import { cn } from "@/lib/utils";
import type { WatchSource } from "@/lib/anime-types";

interface SourceSelectorProps {
  sources: WatchSource[];
  selectedId: number;
  onSelect: (id: number) => void;
}

const QUALITY_BADGE: Record<string, string> = {
  "1080p": "FHD",
  "720p": "HD",
  "480p": "SD",
};

/** Group watch sources by quality, render provider chips per group. */
export function SourceSelector({
  sources,
  selectedId,
  onSelect,
}: SourceSelectorProps) {
  const groups = useMemo(() => {
    const map = new Map<string, WatchSource[]>();
    for (const s of sources) {
      const key = s.quality || "غير محدد";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // preserve best-quality-first order
    return Array.from(map.entries()).sort(
      (a, b) => qualityRankKey(a[0]) - qualityRankKey(b[0])
    );
  }, [sources]);

  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
        لا توجد روابط مشاهدة متاحة لهذه الحلقة.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Tv className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">مزوّدات المشاهدة</h3>
        <span className="text-xs text-muted-foreground">
          ({sources.length.toLocaleString("ar-EG")} رابط)
        </span>
      </div>
      <div className="space-y-3">
        {groups.map(([quality, list]) => (
          <div key={quality} className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-md px-2 text-xs font-bold",
                quality === "1080p"
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                  : quality === "720p"
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-muted text-muted-foreground ring-1 ring-border/60"
              )}
            >
              {QUALITY_BADGE[quality] || quality}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {list.map((s) => {
                const active = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-primary bg-grad-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "border-border/60 bg-background/40 text-foreground/85 hover:border-primary/50 hover:text-foreground"
                    )}
                    title={s.label}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {providerLabel(s.provider)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function qualityRankKey(q: string): number {
  const s = (q || "").toLowerCase();
  if (s === "1080p" || s === "fhd") return 1;
  if (s === "720p" || s === "hd") return 2;
  if (s === "480p" || s === "sd") return 3;
  return 4;
}
