"use client";

import Link from "next/link";
import { Film, Tv, Link2, ShieldAlert, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { StatsResponse } from "@/lib/anime-types";

async function fetchStats(): Promise<StatsResponse> {
  const r = await fetch("/api/stats", { cache: "no-store" });
  if (!r.ok) throw new Error("stats failed");
  return r.json();
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-1.5">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-bold" dir="ltr">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function SiteFooter() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <StatPill
            icon={Film}
            value={stats ? stats.anime.toLocaleString("en-US") : "…"}
            label="أنمي"
          />
          <StatPill
            icon={Tv}
            value={stats ? stats.episodes.toLocaleString("en-US") : "…"}
            label="حلقة"
          />
          <StatPill
            icon={Link2}
            value={stats ? stats.sources.toLocaleString("en-US") : "…"}
            label="رابط مشاهدة"
          />
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="text-sm font-bold text-foreground hover:text-primary">
              Aniverse
            </Link>
            <span className="text-border">·</span>
            <a
              href="/api/download"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-primary/50 hover:text-primary"
              title="نزّل المشروع كاملاً (مضغوط) لتشغّله على حاسوبك"
            >
              <Download className="h-3.5 w-3.5" />
              نزّل المشروع (zip)
            </a>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            مكتبة فهرسية لروابط مشغّلات الأنمي المُجمَّعة علنًا من مصادر البث. لا يستضيف
            الموقع أي ملف فيديو؛ التشغيل يتم عبر مُضمَّنات المزوّدين. قد تكون بعض الروابط
            منتهية أو محذوفة أو تمنع التضمين — يعتمد التوافر على المزوّد.
          </p>
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>لأغراض الفهرسة فقط — تحقّق من مصدر كل حلقة قبل المشاهدة.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
