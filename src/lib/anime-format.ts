/** Client-safe formatting helpers for anime metadata (Arabic UI). */

export function formatScore(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null;
  return (score / 10).toFixed(1);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG");
}

const TYPE_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV قصير",
  MOVIE: "فيلم",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "حلقة خاصة",
  MUSIC: "موسيقي",
};

export function typeLabel(t: string | null | undefined): string | null {
  if (!t) return null;
  return TYPE_LABELS[t] ?? t;
}

const STATUS_LABELS: Record<string, string> = {
  FINISHED: "منتهٍ",
  RELEASING: "يُعرض حاليًا",
  NOT_YET_RELEASED: "لم يُعرض بعد",
  CANCELLED: "ملغى",
};

export function statusLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  return STATUS_LABELS[s] ?? s;
}

const SEASON_LABELS: Record<string, string> = {
  WINTER: "الشتاء",
  SPRING: "الربيع",
  SUMMER: "الصيف",
  FALL: "الخريف",
};

export function seasonLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  return SEASON_LABELS[s] ?? s;
}

export function splitList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Score color tier (for badge tinting): green / amber / red. */
export function scoreTier(score: number | null | undefined): "high" | "mid" | "low" | "none" {
  if (score == null) return "none";
  if (score >= 80) return "high";
  if (score >= 65) return "mid";
  return "low";
}

/** Resolve a cover image: prefer AniList high-res cover, fall back to source poster. */
export function pickPoster(
  coverImage: string | null | undefined,
  posterUrl: string | null | undefined
): string {
  return coverImage || posterUrl || "";
}
