/**
 * Shared helpers for the anime catalog API.
 */

/** Sort rank for a quality string (lower is better). 1080p first. */
export function qualityRank(q: string | null | undefined): number {
  const s = (q ?? "").toLowerCase().trim();
  if (s === "1080p" || s === "fhd") return 1;
  if (s === "720p" || s === "hd") return 2;
  if (s === "480p" || s === "sd") return 3;
  return 4;
}

const PROVIDER_LABELS: Record<string, string> = {
  mp4upload: "Mp4Upload",
  mp4upload_sd: "Mp4Upload (SD)",
  mega_bdon_aaalanat: "Mega بدون إعلانات",
  mega: "Mega",
  mega_sd: "Mega (SD)",
  uqload: "Uqload",
  megamax: "Megamax",
  megamax_2: "Megamax 2",
  sendvid: "SendVid",
  google_drive: "Google Drive",
  google_drive_sd: "Google Drive (SD)",
  vk: "VK",
  videa: "Videa",
  larhu: "Larhu",
  streamruby: "StreamRuby",
};

/** Human-friendly Arabic/latin label for a provider id. */
export function providerLabel(p: string | null | undefined): string {
  const key = (p ?? "").trim();
  if (PROVIDER_LABELS[key]) return PROVIDER_LABELS[key];
  if (!key) return "مزوّد غير معروف";
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** True if the embed URL is likely safe to render in an <iframe>. */
export function isIframeEmbeddable(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  if (!h) return false;
  // vk, mega, mp4upload, uqload, sendvid, videa, streamruby, share4max => embed players
  return [
    "mp4upload.com",
    "www.mp4upload.com",
    "mega.nz",
    "uqload.is",
    "uqload.com",
    "uqload.vc",
    "sendvid.com",
    "videa.hu",
    "vkvideo.ru",
    "share4max.com",
    "streamruby.com",
    "rubyvidhub.com",
    "w.larhu.website",
  ].includes(h);
}
