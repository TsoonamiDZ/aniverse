"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle2,
  Info,
  Film,
  Tv,
  LogOut,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PosterImage } from "@/components/anime/poster-image";
import type { RecentEpisode } from "@/lib/anime-types";

interface PreviewAnime {
  slug: string;
  title: string;
  posterUrl: string;
  episodeCount: number;
}
interface SyncResult {
  sitemapAnime?: number;
  sitemapEpisodes?: number;
  newAnimeInSitemap?: number;
  newEpisodesInSitemap?: number;
  insertedAnime?: number;
  insertedEpisodes?: number;
  insertedSources?: number;
  previewAnime?: PreviewAnime[];
  previewEpisodes?: (PreviewAnime & { episodeNumber?: string; sourcesCount?: number; animeTitle?: string })[];
  durationMs?: number;
}

interface Stats {
  anime: number;
  episodes: number;
  sources: number;
}

async function fetchStats(): Promise<Stats> {
  const r = await fetch("/api/stats", { cache: "no-store" });
  if (!r.ok) throw new Error("stats");
  return r.json();
}

type Phase = "idle" | "scanning" | "review" | "updating" | "done";

export function AdminTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanResult, setScanResult] = useState<SyncResult | null>(null);
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats, staleTime: 30_000 });

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  };

  const startScan = async () => {
    setPhase("scanning");
    setScanResult(null);
    const tid = toast.loading("جارٍ فحص okanime بحثًا عن الجديد…", { duration: Infinity });
    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, limit: 60 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "فشل الفحص");
      setScanResult(data.result as SyncResult);
      setPhase("review");
      toast.success(
        `الفحص اكتمل: ${data.result.newAnimeInSitemap ?? 0} أنمي، ${data.result.newEpisodesInSitemap ?? 0} حلقة`,
        { id: tid, duration: 5000 }
      );
    } catch (e) {
      toast.error("تعذّر الفحص: " + (e instanceof Error ? e.message : "خطأ"), { id: tid });
      setPhase("idle");
    }
  };

  const confirmUpdate = async () => {
    if (!scanResult) return;
    setPhase("updating");
    const tid = toast.loading("جارٍ تحديث قاعدة البيانات…", { duration: Infinity });
    try {
      const limit = Math.min(200, Math.max(30, scanResult.newEpisodesInSitemap ?? 30));
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, limit }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "فشل التحديث");
      const res = data.result as SyncResult;
      toast.success(
        `تم! +${res.insertedAnime ?? 0} أنمي، +${res.insertedEpisodes ?? 0} حلقة، +${res.insertedSources ?? 0} رابط`,
        { id: tid, duration: 8000 }
      );
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["recent-episodes"] });
      qc.invalidateQueries({ queryKey: ["recent-anime"] });
      qc.invalidateQueries({ queryKey: ["home-airing"] });
      qc.invalidateQueries({ queryKey: ["anime-list"] });
      qc.invalidateQueries({ queryKey: ["anime-hero"] });
      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        setScanResult(null);
      }, 2000);
    } catch (e) {
      toast.error("تعذّر التحديث: " + (e instanceof Error ? e.message : "خطأ"), { id: tid });
      setPhase("review");
    }
  };

  const loading = phase === "scanning" || phase === "updating";
  const newAnime = scanResult?.newAnimeInSitemap ?? 0;
  const newEps = scanResult?.newEpisodesInSitemap ?? 0;
  const nothing = newAnime === 0 && newEps === 0;

  return (
    <div className="min-h-screen bg-grad-primary/5">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-grad-primary text-primary-foreground shadow-md shadow-primary/30">
              <Database className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <div className="text-lg font-black">أداة تحديث المكتبة</div>
              <div className="text-[10px] text-muted-foreground">واجهة إدارية محمية</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="text-foreground/80">
              <Link href="/">
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">العودة للموقع</span>
              </Link>
            </Button>
            <Button onClick={logout} variant="ghost" size="sm" className="text-foreground/80" title="خروج">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Stats */}
        <section className="mb-6 grid grid-cols-3 gap-2.5">
          <StatCard icon={Film} label="أنمي" value={stats.data?.anime} loading={stats.isLoading} />
          <StatCard icon={Tv} label="حلقة" value={stats.data?.episodes} loading={stats.isLoading} />
          <StatCard icon={Database} label="رابط مشاهدة" value={stats.data?.sources} loading={stats.isLoading} />
        </section>

        {/* Scan CTA */}
        <section className="mb-6 rounded-2xl border border-border/60 bg-card/60 p-6 text-center">
          <h1 className="text-xl font-bold">فحص موقع okanime عن الجديد</h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
            تفتح الأداة خرائط موقع okanime وتقارنها بقاعدتك، ثم تعرض الأنميات والحلقات
            الجديدة في قائمة — تراجعها ثم تضغط «تحديث قاعدة البيانات» لتظهر على موقعك.
          </p>
          <Button
            onClick={startScan}
            disabled={loading}
            size="lg"
            className="mt-4 h-12 bg-grad-primary px-6 text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
          >
            <Search className="h-5 w-5" />
            {phase === "scanning" ? "جارٍ الفحص…" : phase === "updating" ? "جارٍ التحديث…" : "فحص الجديد"}
          </Button>
        </section>

        {/* Phases */}
        {phase === "scanning" && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/40 py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">جارٍ فحص خرائط okanime واستخراج الجديد…</p>
            <p className="text-xs text-muted-foreground">قد يستغرق هذا 20–40 ثانية</p>
          </div>
        )}

        {phase === "updating" && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/40 py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">جارٍ إضافة الجديد إلى قاعدة البيانات…</p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold">تم التحديث! تُحدّث القاعدة الآن.</p>
          </div>
        )}

        {phase === "review" && scanResult && (
          <div className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              {newAnime > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
                  <Film className="h-3.5 w-3.5" />
                  {newAnime.toLocaleString("en-US")} أنمي جديد
                </span>
              )}
              {newEps > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                  <Tv className="h-3.5 w-3.5" />
                  {newEps.toLocaleString("en-US")} حلقة جديدة
                </span>
              )}
              {nothing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> لا يوجد جديد
                </span>
              )}
            </div>

            {/* New anime */}
            {scanResult.previewAnime && scanResult.previewAnime.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                  الأنميات الجديدة ({scanResult.previewAnime.length}
                  {newAnime > scanResult.previewAnime.length ? ` من ${newAnime.toLocaleString("en-US")}` : ""})
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {scanResult.previewAnime.map((a) => (
                    <div key={a.slug} className="flex gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
                      <div className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded">
                        <PosterImage src={a.posterUrl} alt={a.title} className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug">{a.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {a.episodeCount.toLocaleString("en-US")} حلقة
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New episodes */}
            {scanResult.previewEpisodes && scanResult.previewEpisodes.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                  الحلقات الجديدة ({scanResult.previewEpisodes.length}
                  {newEps > scanResult.previewEpisodes.length ? ` من ${newEps.toLocaleString("en-US")}` : ""})
                </h3>
                <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                  {scanResult.previewEpisodes.map((e) => (
                    <div
                      key={e.slug}
                      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 p-2 text-xs"
                    >
                      <span className="grid h-7 w-9 shrink-0 place-items-center rounded bg-primary/15 text-[11px] font-bold text-primary">
                        {e.episodeNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold">{e.animeTitle}</p>
                        <p className="text-[10px] text-muted-foreground">{e.title}</p>
                      </div>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {e.sourcesCount} رابط
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(newAnime > (scanResult.previewAnime?.length ?? 0) ||
              newEps > (scanResult.previewEpisodes?.length ?? 0)) && (
              <p className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
                المعاينة تعرض أوّل {(scanResult.previewAnime?.length ?? 0) + (scanResult.previewEpisodes?.length ?? 0)} عنصرًا فقط (الإجمالي أكبر). اضغط «تحديث قاعدة البيانات» لإدراجها، وأعد الضغط لسحب المزيد.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhase("idle");
                  setScanResult(null);
                }}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={confirmUpdate}
                disabled={nothing}
                className="bg-grad-primary text-primary-foreground hover:opacity-90"
              >
                <Database className="h-4 w-4" />
                {nothing ? "لا يوجد جديد" : "تحديث قاعدة البيانات"}
              </Button>
            </div>
          </div>
        )}

        {phase === "idle" && (
          <p className="text-center text-xs text-muted-foreground">
            اضغط «فحص الجديد» لبدء العملية. الأداة idempotent — إعادة الفحص آمنة.
          </p>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-3">
      <Icon className="h-5 w-5 text-primary" />
      <div className="leading-none">
        <div className="text-lg font-black" dir="ltr">
          {loading ? "…" : value != null ? value.toLocaleString("en-US") : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
