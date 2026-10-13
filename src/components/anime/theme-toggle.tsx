"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Theme toggle that is hydration-safe AND lint-clean.
 *
 * Both icons are always rendered (identical on server and client => no
 * hydration mismatch); CSS shows only the relevant one based on the `dark`
 * class that next-themes sets on <html> before hydration.
 *
 * The current theme at click-time is read from the DOM (not from useTheme's
 * `theme`, which is undefined during SSR) so the handler is stable.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();

  const toggle = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="تبديل المظهر"
      onClick={toggle}
      className="text-foreground/80 hover:text-foreground"
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}
