import { getSeriesKey, normalizeShowTitle } from '../utils/series'
import type {
  RecommendationsCache,
  RecommendedShow,
  StoredDrama,
  WatchStats,
} from '../types/storage'
import {
  getCreditDate,
  getCreditTitle,
  getLeadTvCredits,
  getPosterUrl,
  getTvLeads,
  isNewRelease,
  searchTvId,
  type TmdbCreditItem,
  type TmdbLead,
} from './tmdb'

const MAX_RECOMMENDATIONS = 10
const NEW_RELEASE_YEARS = 2

type RankedSourceShow = {
  seriesKey: string
  title: string
  watchCount: number
}

type CandidateShow = RecommendedShow & {
  sortPopularity: number
}

function buildFingerprint(dramas: StoredDrama[], excludedLeadSources: string[]): string {
  const dramaPart = dramas
    .map((d) => d.seriesKey || getSeriesKey(d))
    .sort()
    .join('|')
  const excludedPart = [...excludedLeadSources].sort().join('|')
  return `${dramaPart}##${excludedPart}`
}

function rankSourceShows(dramas: StoredDrama[], watchStats: WatchStats): RankedSourceShow[] {
  return dramas
    .map((drama) => {
      const seriesKey = drama.seriesKey || getSeriesKey(drama)
      return {
        seriesKey,
        title: normalizeShowTitle(drama.title),
        watchCount: watchStats[seriesKey] ?? 1,
      }
    })
    .sort((a, b) => b.watchCount - a.watchCount)
}

function isAlreadyInReview(title: string, dramas: StoredDrama[]): boolean {
  const normalized = normalizeShowTitle(title).toLowerCase()
  return dramas.some((drama) => normalizeShowTitle(drama.title).toLowerCase() === normalized)
}

function creditToCandidate(
  credit: TmdbCreditItem,
  lead: TmdbLead,
  source: RankedSourceShow,
  isNew: boolean
): CandidateShow | null {
  const title = getCreditTitle(credit)
  if (!title) return null
  const releaseDate = getCreditDate(credit)
  return {
    tmdbId: credit.id,
    title,
    posterUrl: getPosterUrl(credit.poster_path),
    releaseDate,
    isNew,
    leadName: lead.name,
    leadGender: lead.gender,
    sourceShowTitle: source.title,
    sourceSeriesKey: source.seriesKey,
    sortPopularity: credit.popularity ?? 0,
  }
}

async function collectForSourceShow(
  source: RankedSourceShow,
  apiKey: string,
  dramas: StoredDrama[],
  excludedLeadSources: string[],
  sourceTvId: number
): Promise<{ newShows: CandidateShow[]; oldShows: CandidateShow[] }> {
  const skipNewFromSource = excludedLeadSources.includes(source.seriesKey)
  const leads = await getTvLeads(sourceTvId, apiKey)
  const newShows: CandidateShow[] = []
  const oldShows: CandidateShow[] = []

  for (const lead of leads) {
    const credits = await getLeadTvCredits(lead.id, apiKey)
    for (const credit of credits) {
      if (credit.id === sourceTvId) continue
      const title = getCreditTitle(credit)
      if (!title || isAlreadyInReview(title, dramas)) continue

      const releaseDate = getCreditDate(credit)
      const isNew = isNewRelease(releaseDate, NEW_RELEASE_YEARS)
      const candidate = creditToCandidate(credit, lead, source, isNew)
      if (!candidate) continue

      if (isNew) {
        if (!skipNewFromSource) newShows.push(candidate)
      } else {
        oldShows.push(candidate)
      }
    }
  }

  const byPopularity = (a: CandidateShow, b: CandidateShow) => b.sortPopularity - a.sortPopularity
  return {
    newShows: newShows.sort(byPopularity),
    oldShows: oldShows.sort(byPopularity),
  }
}

function mergeCandidates(buckets: CandidateShow[][], limit: number): RecommendedShow[] {
  const seen = new Set<number>()
  const result: RecommendedShow[] = []

  for (const bucket of buckets) {
    for (const item of bucket) {
      if (seen.has(item.tmdbId)) continue
      seen.add(item.tmdbId)
      const { sortPopularity: _pop, ...show } = item
      result.push(show)
      if (result.length >= limit) return result
    }
  }

  return result
}

export async function buildRecommendations(input: {
  dramas: StoredDrama[]
  watchStats: WatchStats
  excludedLeadSources: string[]
  apiKey: string
}): Promise<RecommendationsCache> {
  const { dramas, watchStats, excludedLeadSources, apiKey } = input
  const fingerprint = buildFingerprint(dramas, excludedLeadSources)

  if (dramas.length === 0) {
    return { fingerprint, items: [], generatedAt: Date.now() }
  }

  const rankedSources = rankSourceShows(dramas, watchStats)
  const newBuckets: CandidateShow[][] = []
  const oldBuckets: CandidateShow[][] = []

  for (const source of rankedSources) {
    const tvId = await searchTvId(source.title, apiKey)
    if (!tvId) continue
    const { newShows, oldShows } = await collectForSourceShow(
      source,
      apiKey,
      dramas,
      excludedLeadSources,
      tvId
    )
    if (newShows.length > 0) newBuckets.push(newShows)
    if (oldShows.length > 0) oldBuckets.push(oldShows)
  }

  const orderedBuckets = [...newBuckets, ...oldBuckets]
  const items = mergeCandidates(orderedBuckets, MAX_RECOMMENDATIONS)

  return {
    fingerprint,
    items,
    generatedAt: Date.now(),
  }
}

export function shouldUseCache(
  cache: RecommendationsCache | undefined,
  fingerprint: string
): cache is RecommendationsCache {
  return Boolean(cache && cache.fingerprint === fingerprint && cache.items.length >= 0)
}

export { buildFingerprint }
