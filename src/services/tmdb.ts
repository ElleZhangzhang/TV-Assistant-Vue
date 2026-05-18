const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

type TmdbSearchResult = {
  results?: Array<{ id: number; name?: string; original_name?: string }>
}

type TmdbCastMember = {
  id: number
  name: string
  gender: number
  order?: number
}

type TmdbCredits = {
  cast?: TmdbCastMember[]
}

export type TmdbCreditItem = {
  id: number
  media_type?: string
  name?: string
  title?: string
  first_air_date?: string
  release_date?: string
  poster_path?: string | null
  popularity?: number
}

type TmdbPersonCredits = {
  cast?: TmdbCreditItem[]
}

export type TmdbLead = {
  id: number
  name: string
  gender: 'male' | 'female'
}

async function tmdbFetch<T>(path: string, apiKey: string): Promise<T> {
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${path}`)
  }
  return response.json() as Promise<T>
}

export async function searchTvId(title: string, apiKey: string): Promise<number | null> {
  const query = encodeURIComponent(title)
  const data = await tmdbFetch<TmdbSearchResult>(
    `/search/tv?query=${query}&language=zh-CN&include_adult=false`,
    apiKey
  )
  return data.results?.[0]?.id ?? null
}

export async function getTvLeads(tvId: number, apiKey: string): Promise<TmdbLead[]> {
  const data = await tmdbFetch<TmdbCredits>(`/tv/${tvId}/credits?language=zh-CN`, apiKey)
  const cast = [...(data.cast || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const female = cast.find((member) => member.gender === 1)
  const male = cast.find((member) => member.gender === 2)
  const leads: TmdbLead[] = []
  if (female) leads.push({ id: female.id, name: female.name, gender: 'female' })
  if (male) leads.push({ id: male.id, name: male.name, gender: 'male' })
  return leads
}

export async function getLeadTvCredits(
  personId: number,
  apiKey: string
): Promise<TmdbCreditItem[]> {
  const data = await tmdbFetch<TmdbPersonCredits>(
    `/person/${personId}/combined_credits?language=zh-CN`,
    apiKey
  )
  return (data.cast || []).filter((item) => item.media_type === 'tv' || !item.media_type)
}

export function getPosterUrl(posterPath: string | null | undefined): string | undefined {
  if (!posterPath) return undefined
  return `${TMDB_IMAGE_BASE}${posterPath}`
}

export function getCreditTitle(item: TmdbCreditItem): string {
  return (item.name || item.title || '').trim()
}

export function getCreditDate(item: TmdbCreditItem): string | undefined {
  return item.first_air_date || item.release_date || undefined
}

export function isNewRelease(date: string | undefined, years = 2): boolean {
  if (!date) return false
  const release = new Date(date)
  if (Number.isNaN(release.getTime())) return false
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - years)
  return release >= cutoff
}
