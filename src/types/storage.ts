export type StoredDrama = {
  id: string
  title: string
  url?: string
  source?: string
  cover?: string
  seriesKey?: string
}

export type RecommendedShow = {
  tmdbId: number
  title: string
  posterUrl?: string
  releaseDate?: string
  isNew: boolean
  leadName: string
  leadGender: 'male' | 'female'
  sourceShowTitle: string
  sourceSeriesKey: string
  overview?: string
}

export type RecommendationsCache = {
  fingerprint: string
  items: RecommendedShow[]
  generatedAt: number
}

export const STORAGE_KEYS = {
  dramas: 'dramas',
  watchStats: 'tv-assistant-watch-stats',
  excludedLeadSources: 'tv-assistant-excluded-lead-sources',
  recommendations: 'tv-assistant-recommendations',
  tmdbApiKey: 'tmdbApiKey',
} as const

export type WatchStats = Record<string, number>
