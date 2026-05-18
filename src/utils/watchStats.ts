import { STORAGE_KEYS } from '../types/storage'
import { getSeriesKey } from './series'

type DramaLike = {
  title: string
  url?: string
  source?: string
  seriesKey?: string
}

export function recordWatchStat(drama: DramaLike): void {
  const seriesKey = drama.seriesKey || getSeriesKey(drama)
  chrome.storage.local.get(STORAGE_KEYS.watchStats, (result) => {
    const stats = (result[STORAGE_KEYS.watchStats] as Record<string, number> | undefined) || {}
    stats[seriesKey] = (stats[seriesKey] || 0) + 1
    chrome.storage.local.set({ [STORAGE_KEYS.watchStats]: stats })
  })
}
