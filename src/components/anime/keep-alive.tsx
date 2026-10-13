"use client";

import { useEffect } from "react";

/**
 * Dev-only client heartbeat: pings /api/ping every 5s while the page is open.
 * This keeps the dev server from being idle-reaped by the sandbox (which kills
 * the server after ~10-15s of no requests). No-op in production.
 */
export function KeepAlive() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const id = window.setInterval(() => {
        fetch("/api/ping", { cache: "no-store" }).catch(() => {});
      }, 5000);
      return () => window.clearInterval(id);
    }
  }, []);
  return null;
}
