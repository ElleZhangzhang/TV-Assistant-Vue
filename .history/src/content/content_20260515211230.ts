// Content Script - 在视频网站中运行
// 功能：在非首页观看超过约 10 秒写入待处理列表；仅当再次打开各站「首页」时弹窗加入好剧回顾（首页不记录、不弹剧）

import { extractDramaInfo, type ExtractedDrama } from '../utils/parser'

console.log('[Content Script] TV追剧助手已注入到页面')

/** 待加入「好剧回顾」的剧集列表（与正式保存的 dramas 分开存） */
const PENDING_DRAMAS_KEY = 'dramasToSave' as const

// ========== 首页判断（与 manifest 中 matches 的站点一致） ==========

function isKnownVideoSiteHostname(hostname: string): boolean {
  return (
    hostname.includes('iqiyi.com') ||
    hostname.includes('mgtv.com') ||
    hostname.includes('qq.com') ||
    hostname.includes('youku.com')
  )
}

/** 路径是否为站点首页（不记录剧集、不弹出待处理选择框的「剧」页除外） */
function isHomePathname(pathname: string): boolean {
  const p = pathname === '' ? '/' : pathname
  const lower = p.toLowerCase()
  return lower === '/' || lower === '/index.html'
}

/** 当前页面是否为视频网站首页（仅首页弹「待加入好剧回顾」框） */
function isVideoSiteHomePage(): boolean {
  const { hostname, pathname } = window.location
  if (!isKnownVideoSiteHostname(hostname)) {
    return false
  }
  return isHomePathname(pathname)
}

/** 已存储条目是否来自首页 URL（用于清理误存的首页噪音） */
function isDramaEntryFromHomePage(drama: ExtractedDrama): boolean {
  if (!drama.url) {
    return false
  }
  try {
    const u = new URL(drama.url)
    if (!isKnownVideoSiteHostname(u.hostname)) {
      return false
    }
    return isHomePathname(u.pathname)
  } catch {
    return false
  }
}

/** 从待处理列表中去掉首页误存项；若仅剩噪音则清空存储 */
function filterPendingDramasForStorage(dramas: ExtractedDrama[]): ExtractedDrama[] {
  return dramas.filter((d) => !isDramaEntryFromHomePage(d))
}

// ========== 数据结构 ==========

interface VideoPlaySession {
  videoElement: HTMLVideoElement
  startTime: number // 播放开始时间(ms)
  drama?: ExtractedDrama
  watchTime: number // 观看时长(秒)
}

// 待保存的剧集列表(按id去重) - 使用 chrome.storage.local 持久化，下次打开站点仍可提示
let dramasToSave = new Map<string, ExtractedDrama>()

// 当前正在播放的视频会话
let currentSession: VideoPlaySession | null = null

// 是否已显示选择框（本页）
let selectionDialogShown = false

// ========== Storage 工具函数 ==========

function mergeDramasFromList(dramas: ExtractedDrama[]): void {
  // 过滤出干净的数据
  const filtered = filterPendingDramasForStorage(dramas)

  // 只把干净数据给dramasToSave
  dramasToSave.clear()
  filtered.forEach((drama) => {
    dramasToSave.set(drama.id, drama)
  })
}

function loadDramasFromStorage(onLoaded?: () => void): void {
  chrome.storage.local.get(PENDING_DRAMAS_KEY, (result) => {
    const dramas = (result[PENDING_DRAMAS_KEY] as ExtractedDrama[] | undefined) || []
    mergeDramasFromList(dramas)
    console.log('[Content] 从 local 加载了', dramasToSave.size, '个有效待处理剧集')
    onLoaded?.()
  })
}

function setupStorageSyncListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[PENDING_DRAMAS_KEY]) {
      return
    }
    const next = changes[PENDING_DRAMAS_KEY].newValue as ExtractedDrama[] | undefined
    if (!next || next.length === 0) {
      dramasToSave.clear()
      return
    }
    mergeDramasFromList(next)
    console.log('[Content] storage 变更，已同步', next.length, '个待处理剧集')
  })
}

function saveDramasToStorage(): void {
  const dramas = Array.from(dramasToSave.values())
  chrome.storage.local.set({ [PENDING_DRAMAS_KEY]: dramas })
  console.log('[Content] 保存了', dramas.length, '个待处理剧集到 local')
}

function clearDramasFromStorage(): void {
  chrome.storage.local.remove(PENDING_DRAMAS_KEY)
  console.log('[Content] 已清空 local 中的待处理剧集')
}

// ========== 监听 video 播放事件 ==========

function startWatchingVideo(videoElement: HTMLVideoElement) {
  console.log('[Content] 用户开始播放视频')

  currentSession = {
    videoElement,
    startTime: Date.now(),
    watchTime: 0,
  }

  const watchInterval = setInterval(() => {
    if (!currentSession) {
      clearInterval(watchInterval)
      return
    }

    if (videoElement.paused) {
      return
    }

    currentSession.watchTime += 1

    if (currentSession.watchTime === 10) {
      if (isVideoSiteHomePage()) {
        console.log('[Content] 当前为站点首页，不记录剧集信息')
        return
      }
      console.log('[Content] 用户观看时长已达 10 秒，提取剧集信息')
      const drama = extractDramaInfo()
      currentSession.drama = drama
      dramasToSave.set(drama.id, drama)
      saveDramasToStorage()
      console.log('[Content] 待处理列表:', Array.from(dramasToSave.values()))
    }

    if (currentSession.watchTime % 60 === 0) {
      const minutes = Math.floor(currentSession.watchTime / 60)
      console.log(`[Content] 已观看 ${minutes} 分钟`)
    }
  }, 1000)

  const stopWatching = () => {
    console.log('[Content] 视频播放结束或用户离开')
    clearInterval(watchInterval)
    if (currentSession?.videoElement === videoElement) {
      currentSession = null
    }
  }

  videoElement.addEventListener('ended', stopWatching, { once: true })
}

function setupVideoListeners() {
  const observer = new MutationObserver(() => {
    const videos = document.querySelectorAll('video')
    videos.forEach((video) => {
      if (!video.dataset.tvAssistantListening) {
        video.addEventListener('play', () => startWatchingVideo(video))
        video.dataset.tvAssistantListening = 'true'
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  document.querySelectorAll('video').forEach((video) => {
    video.addEventListener('play', () => startWatchingVideo(video))
  })
}

// ========== 下次打开站点时：从存储弹选择框 ==========

function renderDramaSelectModal(dramas: ExtractedDrama[]) {
  if (selectionDialogShown || dramas.length === 0) {
    return
  }

  if (!document.body) {
    document.addEventListener(
      'DOMContentLoaded',
      () => renderDramaSelectModal(dramas),
      { once: true }
    )
    return
  }

  selectionDialogShown = true
  console.log('[Content] 显示剧集选择框（来自存储，共', dramas.length, '条）')

  const modal = document.createElement('div')
  modal.id = 'drama-select-modal'
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  const card = document.createElement('div')
  card.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  `

  const title = document.createElement('h3')
  title.textContent = '加入好剧回顾'
  title.style.cssText = `
    margin: 0 0 8px 0;
    font-size: 18px;
    color: #2c3e50;
  `
  card.appendChild(title)

  const subtitle = document.createElement('p')
  subtitle.textContent = '上次在该站观看记录如下，请选择要加入「好剧回顾」的剧集：'
  subtitle.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #666;
    line-height: 1.4;
  `
  card.appendChild(subtitle)

  const dramList = document.createElement('div')
  dramList.style.cssText = `
    margin-bottom: 16px;
    max-height: 400px;
    overflow-y: auto;
  `

  dramas.forEach((drama) => {
    const label = document.createElement('label')
    label.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 0;
      cursor: pointer;
      user-select: none;
    `

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = drama.id
    checkbox.checked = true
    checkbox.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
      width: 16px;
      height: 16px;
    `

    const dramaTitle = document.createElement('span')
    dramaTitle.textContent = drama.title
    dramaTitle.style.cssText = `
      flex: 1;
      color: #2c3e50;
      font-size: 14px;
    `

    const source = document.createElement('span')
    source.textContent = drama.source || ''
    source.style.cssText = `
      font-size: 12px;
      color: #999;
      margin-left: 8px;
    `

    label.appendChild(checkbox)
    label.appendChild(dramaTitle)
    label.appendChild(source)
    dramList.appendChild(label)
  })
  card.appendChild(dramList)

  const buttonContainer = document.createElement('div')
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `

  const confirmBtn = document.createElement('button')
  confirmBtn.textContent = '加入好剧回顾'
  confirmBtn.style.cssText = `
    padding: 8px 16px;
    background-color: #ff6b6b;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `
  confirmBtn.addEventListener('click', () => {
    const checked = Array.from(dramList.querySelectorAll('input[type="checkbox"]:checked'))
    const selectedIds = checked.map((cb) => (cb as HTMLInputElement).value)

    console.log('[Content] 用户选择加入好剧回顾的剧:', selectedIds)

    const dramasToSaveList = selectedIds
      .map((id) => dramasToSave.get(id))
      .filter(Boolean) as ExtractedDrama[]

    chrome.runtime.sendMessage(
      {
        type: 'SAVE_DRAMAS',
        data: dramasToSaveList,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Content] 加入好剧回顾失败:', chrome.runtime.lastError.message)
        }
        modal.remove()
        dramasToSave.clear()
        selectionDialogShown = false
        clearDramasFromStorage()
        console.log('[Content] 已加入好剧回顾并清空待处理存储')
      }
    )
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = '取消'
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    background-color: #f0f0f0;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `
  cancelBtn.addEventListener('click', () => {
    modal.remove()
    selectionDialogShown = false
    clearDramasFromStorage() // 清空待处理剧
    dramasToSave.clear()
    console.log('[Content] 用户取消，已清空待处理列表')
  })

  buttonContainer.appendChild(confirmBtn)
  buttonContainer.appendChild(cancelBtn)
  card.appendChild(buttonContainer)

  modal.appendChild(card)
  document.body.appendChild(modal)
}

/** 仅在打开各站「首页」且有待处理记录时弹一次（剧集页不弹） */
function tryShowPendingDialogOnceOnVisit(): void {
  if (!isVideoSiteHomePage()) {
    console.log('[Content] 非首页，不弹出待处理选择框')
    return
  }

  chrome.storage.local.get(PENDING_DRAMAS_KEY, (result) => {
    const raw = (result[PENDING_DRAMAS_KEY] as ExtractedDrama[] | undefined) || []
    mergeDramasFromList(raw)
    const toShow = Array.from(dramasToSave.values())

    if (toShow.length === 0) {
      if (raw.length > 0) {
        chrome.storage.local.remove(PENDING_DRAMAS_KEY)
        console.log('[Content] 待处理列表仅含首页误存数据，已清空')
      }
      return
    }

    if (toShow.length !== raw.length) {
      saveDramasToStorage()
      console.log('[Content] 已从待处理列表移除首页误存项并写回存储')
    }

    requestAnimationFrame(() => {
      renderDramaSelectModal(toShow)
    })
  })
}

// ========== 初始化 ==========

loadDramasFromStorage(() => {
  setTimeout(() => tryShowPendingDialogOnceOnVisit(), 400)
})

setupStorageSyncListener()
setupVideoListeners()

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadDramasFromStorage()
  }
})

console.log('[Content Script] 初始化完成，开始监听视频...')
