/** 从页面标题提取「剧」级名称（去掉集/期，保留季） */
export function normalizeShowTitle(rawTitle: string): string {
  let title = rawTitle.trim()
  if (!title) return ''

  const quoted = title.match(/《([^》]+)》/)
  if (quoted?.[1]) {
    title = quoted[1]
  } else {
    title = (title.split(/[-–—|]/)[0] ?? title).trim()
  }

  title = title
    .replace(/第\s*\d+\s*[期集话部]/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\s+/g, '')
    .trim()

  return title || rawTitle.trim()
}

/** 同一部剧（跨集）共用的匹配键 */
export function getSeriesKey(drama: {
  title: string
  url?: string
  source?: string
}): string {
  const source = drama.source?.trim() || 'unknown'
  const showTitle = normalizeShowTitle(drama.title)
  return `${source}::${showTitle}`
}
