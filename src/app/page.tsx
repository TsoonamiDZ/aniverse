"use client";

import { Suspense } from "react";
import { AnimeApp } from "@/components/anime/anime-app";
import { SiteHeader } from "@/components/anime/site-header";
import { SiteFooter } from "@/components/anime/site-footer";

function AppBootSkeleton() {
  // Minimal shell shown while searchParams resolve.
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">
          جارٍ التحميل…
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AppBootSkeleton />}>
      <AnimeApp />
    </Suspense>
  );
}
