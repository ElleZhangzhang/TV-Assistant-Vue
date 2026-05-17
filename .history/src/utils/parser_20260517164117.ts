export type ExtractedDrama = {
  id: string
  title: string
  url?: string
  source?: string
  cover?: string
}

function getSourceFromHostname(hostname: string): string {
  if (hostname.includes('qq.com')) return '腾讯视频'
  if (hostname.includes('iqiyi.com')) return '爱奇艺'
  if (hostname.includes('youku.com')) return '优酷'
  if (hostname.includes('mgtv.com')) return '芒果TV'
  return hostname
}

function buildId(title: string, url: string): string {
  return `${title}::${url}`
}

function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  try {
    return new URL(raw, window.location.href).toString()
  } catch {
    return undefined
  }
}

function normalizeImageValue(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return normalizeUrl(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeImageValue(item)
      if (normalized) return normalized
    }
    return undefined
  }
  if (typeof value === 'object' && value !== null) {
    const url = (value as { url?: unknown }).url
    if (typeof url === 'string') return normalizeUrl(url)
  }
  return undefined
}

function getStructuredDataImage(): string | undefined {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  const allowedTypes = new Set([
    'VideoObject',
    'TVSeries',
    'Movie',
    'Episode',
    'CreativeWork',
  ])

  for (const script of Array.from(scripts)) {
    const text = script.textContent?.trim()
    if (!text) continue
    try {
      const data = JSON.parse(text)
      const nodes = Array.isArray(data) ? data : [data]
      for (const node of nodes) {
        const graph = (node as { ['@graph']?: unknown })['@graph']
        const items = Array.isArray(graph) ? graph : [node]
        for (const item of items) {
          if (!item || typeof item !== 'object') continue
          const typeValue = (item as { ['@type']?: unknown })['@type']
          const types = Array.isArray(typeValue) ? typeValue : [typeValue]
          const matched = types.some((t) => typeof t === 'string' && allowedTypes.has(t))
          if (!matched) continue
          const imageValue = (item as { image?: unknown }).image
          const thumbValue = (item as { thumbnailUrl?: unknown }).thumbnailUrl
          const image = normalizeImageValue(imageValue) || normalizeImageValue(thumbValue)
          if (image) return image
        }
      }
    } catch {
      continue
    }
  }

  return undefined
}

function getMetaImage(): string | undefined {
  const selectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[itemprop="image"]',
  ]

  for (const selector of selectors) {
    const el = document.querySelector(selector) as HTMLMetaElement | null
    const content = el?.content?.trim()
    const normalized = normalizeUrl(content)
    if (normalized) {
      return normalized
    }
  }

  return undefined
}

function getVideoPoster(): string | undefined {
  const video = document.querySelector('video') as HTMLVideoElement | null
  return normalizeUrl(video?.poster)
}

function getLargestImage(): string | undefined {
  let best: HTMLImageElement | null = null
  let bestArea = 0
  for (const img of Array.from(document.images)) {
    const src = normalizeUrl(img.currentSrc || img.src)
    if (!src) continue
    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    const area = width * height
    if (area < 200 * 200) continue
    if (area > bestArea) {
      bestArea = area
      best = img
    }
  }
  return normalizeUrl(best?.currentSrc || best?.src)
}

export function extractDramaInfo(): ExtractedDrama {
  const title = document.title?.trim() || '未知剧集'
  const url = window.location.href
  const source = getSourceFromHostname(window.location.hostname)
  const cover =
    getStructuredDataImage() ||
    getMetaImage() ||
    getVideoPoster() ||
    getLargestImage()

  return {
    id: buildId(title, url),
    title,
    url,
    source,
    cover,
  }
}
