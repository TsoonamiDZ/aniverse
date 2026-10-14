import { Suspense } from "react";
import { AnimeApp } from "@/components/anime/anime-app";

// Force dynamic rendering — the page drives its state from URL searchParams
// (via useSearchParams in client components), so it must NOT be statically
// prerendered at build time. This avoids the "useSearchParams should be wrapped
// in a suspense boundary" prerender error during `next build`.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Plain boot skeleton (no useSearchParams-having components) shown while the
 * client shell hydrates. */
function AppBootSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-16 border-b border-border/60 bg-background/80" />
      <main className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">جارٍ التحميل…</div>
      </main>
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
