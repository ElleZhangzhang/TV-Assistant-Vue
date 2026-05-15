type StoredDrama = {
    id: string
    title: string
    url?: string
    source?: string
    cover?: string
}

const DRAMAS_KEY = 'dramas'

function mergeById(existing: StoredDrama[], incoming: StoredDrama[]): StoredDrama[] {
    const map = new Map<string, StoredDrama>()
    existing.forEach((item) => map.set(item.id, item))
    incoming.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') {
        return
    }

    if (message.type === 'SAVE_DRAMAS') {
        const incoming = (message.data as StoredDrama[]) || []
        chrome.storage.local.get(DRAMAS_KEY, (result) => {
            const existing = (result[DRAMAS_KEY] as StoredDrama[] | undefined) || []
            const merged = mergeById(existing, incoming)
            chrome.storage.local.set({ [DRAMAS_KEY]: merged }, () => {
                sendResponse({ ok: true, count: merged.length })
            })
        })
        return true
    }
})
