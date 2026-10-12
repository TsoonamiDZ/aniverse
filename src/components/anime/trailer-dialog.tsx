"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrailerButtonProps {
  youtubeId: string | null;
  title: string;
}

/** Button that opens a YouTube trailer in a modal. Renders nothing if no trailer. */
export function TrailerButton({ youtubeId, title }: TrailerButtonProps) {
  const [open, setOpen] = useState(false);
  if (!youtubeId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
      >
        <Film className="h-4 w-4" />
        شاهد الإعلان
      </button>
      <DialogContent
        className="max-w-4xl border-border/60 bg-black p-0 sm:rounded-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">إعلان: {title}</DialogTitle>
        <DialogDescription className="sr-only">مشاهدة الإعلان التشويقي على يوتيوب</DialogDescription>
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl">
          {open && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
              title={`إعلان ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          )}
        </div>
        <div className="flex items-center gap-2 bg-card px-4 py-2.5 text-sm">
          <Film className="h-4 w-4 text-primary" />
          <span className="font-semibold">{title}</span>
          <span className="text-muted-foreground">— الإعلان التشويقي</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
