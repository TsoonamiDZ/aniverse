"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ totalAnime }: { totalAnime?: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const urlQ = sp.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);

  // React-recommended pattern for adjusting state when external (URL) value
  // changes: setState during render (NOT in an effect) — safe + lint-clean.
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setValue(urlQ);
  }

  // Debounced live search → push to URL.
  useEffect(() => {
    const q = value.trim();
    const params = new URLSearchParams(sp.toString());
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      params.delete("anime");
      params.delete("watch");
      router.replace(`/?${params.toString()}`, { scroll: false });
    }, 450);
    return () => clearTimeout(t);
  }, [value, sp, router]);

  const clearSearch = () => {
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="أنيقا — الصفحة الرئيسية"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-grad-primary text-primary-foreground shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tight">أنيقا</span>
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
              {totalAnime ? `${totalAnime.toLocaleString("en-US")} أنمي` : "مكتبة الأنمي"}
            </span>
          </div>
        </Link>

        <form
          className="relative mx-auto flex w-full max-w-xl items-center"
          onSubmit={(e) => {
            e.preventDefault();
            inputRef.current?.blur();
          }}
          role="search"
        >
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ابحث عن أنمي... (مثال: One Piece, Naruto, Bleach)"
            className="h-10 rounded-full border-border/60 bg-card/60 pr-9 pl-9 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-primary/30"
            aria-label="البحث عن أنمي"
          />
          {value && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-foreground/80 hover:text-foreground sm:inline-flex"
          >
            <Link href="/?sort=shuffle">اكتشاف</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
