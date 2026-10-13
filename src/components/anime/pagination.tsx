"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}

/** Compact pagination with prev/next + windowed page numbers + ellipses. */
export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build a windowed list of page numbers around the current page.
  const pages: (number | "...")[] = [];
  const add = (p: number | "...") => pages.push(p);
  const window = 1; // neighbors on each side
  add(1);
  if (page - window > 2) add("...");
  for (
    let p = Math.max(2, page - window);
    p <= Math.min(totalPages - 1, page + window);
    p++
  ) {
    add(p);
  }
  if (page + window < totalPages - 1) add("...");
  if (totalPages > 1) add(totalPages);

  const baseBtn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors";

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1.5"
      aria-label="ترقيم الصفحات"
    >
      <Link
        href={hrefForPage(page - 1)}
        aria-label="الصفحة السابقة"
        aria-disabled={page <= 1}
        className={cn(
          baseBtn,
          "border-border/60 bg-card/40 px-3 text-foreground hover:border-primary/50 hover:bg-accent/40",
          page <= 1 && "pointer-events-none opacity-40"
        )}
        onClick={(e) => page <= 1 && e.preventDefault()}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">السابق</span>
      </Link>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`e-${i}`}
            className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefForPage(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              baseBtn,
              "px-2.5",
              p === page
                ? "border-primary bg-grad-primary px-3 text-primary-foreground shadow-md shadow-primary/30"
                : "border-border/60 bg-card/40 text-foreground hover:border-primary/50 hover:bg-accent/40"
            )}
          >
            {p.toLocaleString("en-US")}
          </Link>
        )
      )}

      <Link
        href={hrefForPage(page + 1)}
        aria-label="الصفحة التالية"
        aria-disabled={page >= totalPages}
        className={cn(
          baseBtn,
          "border-border/60 bg-card/40 px-3 text-foreground hover:border-primary/50 hover:bg-accent/40",
          page >= totalPages && "pointer-events-none opacity-40"
        )}
        onClick={(e) => page >= totalPages && e.preventDefault()}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">التالي</span>
      </Link>
    </nav>
  );
}
