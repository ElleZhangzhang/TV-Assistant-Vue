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

export function extractDramaInfo(): ExtractedDrama {
  const title = document.title?.trim() || '未知剧集'
  const url = window.location.href
  const source = getSourceFromHostname(window.location.hostname)

  return {
    id: buildId(title, url),
    title,
    url,
    source,
  }
}
