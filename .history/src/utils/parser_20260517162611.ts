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

function getFallbackImage(): string | undefined {
    const img = document.querySelector('img') as HTMLImageElement | null
    return normalizeUrl(img?.src)
}

export function extractDramaInfo(): ExtractedDrama {
    const title = document.title?.trim() || '未知剧集'
    const url = window.location.href
    const source = getSourceFromHostname(window.location.hostname)
    const cover = getMetaImage() || getVideoPoster() || getFallbackImage()

    return {
        id: buildId(title, url),
        title,
        url,
        source,
        cover,
    }
}
