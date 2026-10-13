"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertCircle, Film, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PosterImage } from "./poster-image";

interface PreviewAnime {
  slug: string;
  title: string;
  posterUrl: string;
  episodeCount: number;
}
interface PreviewEpisode {
  slug: string;
  title: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: string;
  sourcesCount: number;
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
  previewEpisodes?: PreviewEpisode[];
  durationMs?: number;
}

type Phase = "idle" | "scanning" | "review" | "updating" | "done";

/** Two-step update button: scan (dry-run) → review list → update DB. */
export function SyncButton() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanResult, setScanResult] = useState<SyncResult | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  const startScan = async () => {
    setPhase("scanning");
    setOpen(true);
    const tid = toast.loading("جارٍ فحص okanime بحثًا عن الجديد…", { duration: Infinity });
    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, limit: 60 }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "فشل الفحص");
      const res: SyncResult = data.result;
      setScanResult(res);
      setPhase("review");
      toast.success(
        `الفحص اكتمل: ${res.newAnimeInSitemap ?? 0} أنمي جديد، ${res.newEpisodesInSitemap ?? 0} حلقة جديدة`,
        { id: tid, duration: 5000 }
      );
    } catch (e) {
      toast.error("تعذّر الفحص: " + (e instanceof Error ? e.message : "خطأ"), { id: tid });
      setPhase("idle");
      setOpen(false);
    }
  };

  const confirmUpdate = async () => {
    if (!scanResult) return;
    const total = (scanResult.newAnimeInSitemap ?? 0) + (scanResult.newEpisodesInSitemap ?? 0);
    setPhase("updating");
    const tid = toast.loading("جارٍ تحديث قاعدة البيانات…", { duration: Infinity });
    try {
      // Insert up to as many as were found (bounded by the API's own cap).
      const limit = Math.max(30, (scanResult.newEpisodesInSitemap ?? 0) || 30);
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, limit: Math.min(200, limit) }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "فشل التحديث");
      const res: SyncResult = data.result;
      toast.success(
        `تم التحديث! +${res.insertedAnime ?? 0} أنمي، +${res.insertedEpisodes ?? 0} حلقة، +${res.insertedSources ?? 0} رابط مشاهدة`,
        { id: tid, duration: 8000 }
      );
      // Refresh the on-page data so new anime/episodes appear immediately.
      qc.invalidateQueries({ queryKey: ["anime-list"] });
      qc.invalidateQueries({ queryKey: ["anime-hero"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["anime-detail"] });
      qc.invalidateQueries({ queryKey: ["episode"] });
      router.refresh();
      setPhase("done");
      setTimeout(() => {
        setOpen(false);
        setPhase("idle");
        setScanResult(null);
      }, 1500);
    } catch (e) {
      toast.error("تعذّر التحديث: " + (e instanceof Error ? e.message : "خطأ"), { id: tid });
      setPhase("review");
    }
  };

  const loading = phase === "scanning" || phase === "updating";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={startScan}
        disabled={loading}
        className="gap-1.5 text-foreground/80 hover:text-foreground"
        aria-label="فحص وتحديث المكتبة"
        title="افحص okanime وأضف الجديد"
      >
        <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        <span className="hidden md:inline">تحديث</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="max-w-3xl border-border/60 bg-card/95 backdrop-blur">
          <DialogTitle className="sr-only">نتيجة فحص التحديث</DialogTitle>
          <DialogDescription className="sr-only">
            قائمة بالأنميات والحلقات الجديدة المكتشفة من okanime
          </DialogDescription>

          {phase === "scanning" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">جارٍ فحص خرائط okanime واستخراج الجديد…</p>
              <p className="text-xs text-muted-foreground">قد يستغرق هذا بضع ثوانٍ</p>
            </div>
          )}

          {phase === "review" && scanResult && (
            <ReviewBody result={scanResult} onConfirm={confirmUpdate} onCancel={() => setOpen(false)} />
          )}

          {phase === "updating" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">جارٍ إضافة الجديد إلى قاعدة البيانات…</p>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-bold">تم التحديث! تُحدّث الصفحة الآن…</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReviewBody({
  result,
  onConfirm,
  onCancel,
}: {
  result: SyncResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const newAnime = result.newAnimeInSitemap ?? 0;
  const newEps = result.newEpisodesInSitemap ?? 0;
  const nothing = newAnime === 0 && newEps === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <RefreshCw className="h-4 w-4 text-primary" />
            نتيجة الفحص
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            فحص {result.sitemapAnime?.toLocaleString("ar-EG") ?? 0} أنمي و
            {result.sitemapEpisodes?.toLocaleString("ar-EG") ?? 0} حلقة في خرائط okanime
          </p>
        </div>
      </div>

      {nothing ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          <p className="text-sm font-semibold">المكتبة محدّثة — لا يوجد جديد الآن</p>
          <p className="text-xs text-muted-foreground">جميع الأنميات والحلقات من okanime مُدرجة بالفعل</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {newAnime > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
                <Film className="h-3.5 w-3.5" />
                {newAnime.toLocaleString("ar-EG")} أنمي جديد
              </span>
            )}
            {newEps > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                <Tv className="h-3.5 w-3.5" />
                {newEps.toLocaleString("ar-EG")} حلقة جديدة
              </span>
            )}
          </div>

          {/* New anime preview list */}
          {result.previewAnime && result.previewAnime.length > 0 && (
            <Section title="الأنميات الجديدة" count={result.previewAnime.length} total={newAnime}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {result.previewAnime.map((a) => (
                  <div
                    key={a.slug}
                    className="flex gap-2 rounded-lg border border-border/50 bg-background/40 p-2"
                  >
                    <div className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded">
                      <PosterImage src={a.posterUrl} alt={a.title} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug">{a.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {a.episodeCount.toLocaleString("ar-EG")} حلقة
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* New episodes preview list */}
          {result.previewEpisodes && result.previewEpisodes.length > 0 && (
            <Section title="الحلقات الجديدة" count={result.previewEpisodes.length} total={newEps}>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                {result.previewEpisodes.map((e) => (
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
            </Section>
          )}

          {(newAnime > result.previewAnime!.length || newEps > result.previewEpisodes!.length) && (
            <p className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              تُعرض هنا أوّل {result.previewAnime!.length + result.previewEpisodes!.length} عنصرًا فقط من الجديد. سيُدرج
              التحديث ما يصل إليه (حتى 200 حلقة لكل ضغطة — أعد الضغط للمزيد).
            </p>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
          إلغاء
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={nothing}
          className="bg-grad-primary text-primary-foreground hover:opacity-90"
        >
          {nothing ? "لا يوجد جديد" : "تحديث قاعدة البيانات"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  total,
  children,
}: {
  title: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        {title}
        <span className="text-foreground/70">
          ({count.toLocaleString("ar-EG")}
          {total > count ? ` من ${total.toLocaleString("ar-EG")}` : ""})
        </span>
      </h3>
      {children}
    </div>
  );
}
