"use client";

import { useState } from "react";
import { ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIframeEmbeddable } from "@/lib/anime-helpers";
import type { WatchSource } from "@/lib/anime-types";

interface VideoPlayerProps {
  source: WatchSource;
}

/** Iframe embed player with loading state and a graceful fallback note. */
export function VideoPlayer({ source }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const embeddable = isIframeEmbeddable(source.providerHost);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black shadow-xl">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black text-white/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">جارٍ تحميل المُشغّل…</span>
        </div>
      )}

      {embeddable ? (
        <iframe
          key={source.id}
          src={source.watchUrl}
          title={source.label}
          loading="lazy"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">
            قد يمنع هذا المزوّد التضمين داخل الصفحة
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            بعض مزوّدي المشاهدة يفرضون قيودًا على التضمين. يمكنك فتح الرابط مباشرةً
            في نافذة جديدة لمتابعة المشاهدة.
          </p>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-20">
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="bg-black/60 text-white backdrop-blur hover:bg-black/80"
        >
          <a
            href={source.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            نافذة جديدة
          </a>
        </Button>
      </div>
    </div>
  );
}
