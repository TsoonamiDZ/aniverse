/** Shared TypeScript types matching the anime catalog API responses. */

export interface AnimeListItem {
  id: string;
  slug: string;
  title: string;
  posterUrl: string;
  episodeCount: number;
  sourceCount: number;
  // AniList/MAL enrichment (all nullable until fetched)
  score: number | null;
  animeType: string | null;
  airedYear: number | null;
  coverImage: string | null;
  coverColor: string | null;
  bannerImage: string | null;
  trailerYoutubeId: string | null;
  titleEnglish: string | null;
  popularity: number | null;
  genres: string | null;
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
  // AniList/MAL enrichment
  anilistId: number | null;
  malId: number | null;
  anilistUrl: string | null;
  malUrl: string | null;
  coverImage: string | null;
  coverColor: string | null;
  bannerImage: string | null;
  trailerYoutubeId: string | null;
  trailerThumbnail: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  animeType: string | null;
  animeSource: string | null;
  malEpisodes: number | null;
  animeStatus: string | null;
  airing: boolean | null;
  airedString: string | null;
  airedYear: number | null;
  season: string | null;
  duration: number | null;
  score: number | null;
  popularity: number | null;
  favorites: number | null;
  synopsis: string | null;
  studios: string | null;
  genres: string | null;
  tags: string | null;
  nextEpisode: number | null;
  nextEpisodeAirAt: string | null;
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

export type SortKey = "popular" | "episodes" | "rating" | "title" | "shuffle";

export const SORT_LABELS: Record<SortKey, string> = {
  popular: "الأكثر رواجًا",
  episodes: "الأكثر حلقات",
  rating: "الأعلى تقييماً",
  title: "أبجديًا",
  shuffle: "اكتشاف عشوائي",
};
