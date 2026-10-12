/** Shared TypeScript types matching the anime catalog API responses. */

export interface AnimeListItem {
  id: string;
  slug: string;
  title: string;
  posterUrl: string;
  episodeCount: number;
  sourceCount: number;
}

export interface AnimeListResponse {
  items: AnimeListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
  q: string;
}

export interface AnimeEpisodeRef {
  id: string;
  slug: string;
  title: string;
  episodeNumber: string;
  episodeSort: number;
  posterUrl: string;
}

export interface AnimeDetailResponse {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  posterUrl: string;
  episodeCount: number;
  sourceCount: number;
  episodes: AnimeEpisodeRef[];
}

export interface WatchSource {
  id: number;
  provider: string;
  quality: string;
  label: string;
  watchUrl: string;
  providerHost: string;
}

export interface EpisodeSibling {
  id: string;
  episodeNumber: string;
  title: string;
  slug: string;
}

export interface EpisodeDetailResponse {
  id: string;
  slug: string;
  title: string;
  animeId: string;
  animeSlug: string;
  animeTitle: string;
  animePosterUrl: string;
  episodeNumber: string;
  episodeSort: number;
  posterUrl: string;
  episodePageUrl: string;
  sources: WatchSource[];
  prev: EpisodeSibling | null;
  next: EpisodeSibling | null;
}

export interface StatsResponse {
  anime: number;
  episodes: number;
  sources: number;
  providers: number;
  topProviders: { provider: string; count: number }[];
}

export type SortKey = "popular" | "episodes" | "title" | "shuffle";

export const SORT_LABELS: Record<SortKey, string> = {
  popular: "الأكثر رواجًا",
  episodes: "الأكثر حلقات",
  title: "أبجديًا",
  shuffle: "اكتشاف عشوائي",
};
