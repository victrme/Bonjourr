import { resizeThumbnail, thumbnailSourceKey, thumbnailWebsiteUrl, writeThumbnail } from '../shared/thumbnails.ts'
import type { LinkElem } from '../../types/shared.ts'

const api = (globalThis.browser ?? globalThis.chrome) as unknown as typeof chrome
const pending = new Map<string, Promise<void>>()
let queue = Promise.resolve()
let queueGeneration = 0

export function registerThumbnailCapture(): void {
    api.runtime.onMessage.addListener((message, sender, reply) => {
        if (!['bonjourr-thumbnail-capture', 'bonjourr-thumbnail-cancel'].includes(message?.type)) return
        if (sender.id !== api.runtime.id || sender.url !== api.runtime.getURL('index.html') || sender.tab?.incognito) {
            reply({ error: 'Thumbnail capture is only available from a regular Bonjourr tab' })
            return
        }
        if (message.type === 'bonjourr-thumbnail-cancel') {
            queueGeneration++
            reply({ ok: true })
            return
        }
        if (typeof message.id !== 'string' || typeof message.url !== 'string') {
            reply({ error: 'Invalid thumbnail request' })
            return
        }
        enqueueCapture(message.id, message.url).then(
            () => reply({ ok: true }),
            (error: Error) => reply({ error: error.message }),
        )
        return true
    })
}

export function enqueueCapture(id: string, url: string): Promise<void> {
    const generation = queueGeneration
    const key = JSON.stringify([id, url, generation])
    const existing = pending.get(key)
    if (existing) return existing
    if (pending.size >= 20) return Promise.reject(new Error('The thumbnail queue is full. Try again later.'))
    const job = queue.then(() => captureThumbnail(id, url, generation))
    pending.set(key, job)
    queue = job.catch(() => {}).then(() => {
        pending.delete(key)
    })
    return job
}

async function captureLink(id: string, url: string): Promise<LinkElem> {
    const local = await api.storage.local.get(['thumbnailCaptureEnabled', 'syncStorage'])
    if (!local.thumbnailCaptureEnabled || !await api.permissions.contains({ origins: ['<all_urls>'] })) {
        throw new Error('Enable local thumbnail capture in Quick Links settings first')
    }
    const data = (local.syncStorage ?? await api.storage.sync.get(id)) as Record<string, unknown>
    const link = data[id] as LinkElem | undefined
    if (!link || link._id !== id || link.folder || link.url !== url || link.thumbnail?.type !== 'capture') {
        throw new Error('The link changed before its thumbnail could be saved')
    }
    thumbnailWebsiteUrl(link.url)
    return link
}

async function captureThumbnail(id: string, url: string, generation: number): Promise<void> {
    await captureLink(id, url)
    if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
    const previousWindow = await api.windows.getLastFocused()
    let windowId: number | undefined
    try {
        const window = await api.windows.create({ url, state: 'minimized', type: 'normal' })
        windowId = window?.id
        const tabId = window?.tabs?.[0]?.id
        if (windowId === undefined || tabId === undefined) throw new Error('Cannot create capture window')
        await api.tabs.update(tabId, { muted: true })
        const deadline = Date.now() + 45000
        let loadedAt = 0
        let loadedUrl = ''
        while (Date.now() < deadline) {
            if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
            const tab = await api.tabs.get(tabId)
            if (tab.status !== 'complete' || tab.url !== loadedUrl) {
                loadedAt = 0
                loadedUrl = tab.url ?? ''
            }
            if (tab.status === 'complete' && !loadedAt) loadedAt = Date.now()
            if (loadedAt && Date.now() - loadedAt >= 2000) break
            await new Promise((resolve) => setTimeout(resolve, 250))
        }
        if (!loadedAt || Date.now() >= deadline) throw new Error('The website took too long to load')
        thumbnailWebsiteUrl(loadedUrl)
        await api.windows.update(windowId, { state: 'normal', focused: true, width: 1024, height: 768 })
        await new Promise((resolve) => setTimeout(resolve, 500))
        const before = (await api.tabs.query({ windowId, active: true }))[0]
        if (before?.id !== tabId || before.url !== loadedUrl || before.status !== 'complete') {
            throw new Error('The capture tab changed')
        }
        let captureTimer: ReturnType<typeof setTimeout> | undefined
        let image: string
        try {
            image = await Promise.race([
                api.tabs.captureVisibleTab(windowId, { format: 'png' }),
                new Promise<never>((_, reject) => {
                    captureTimer = setTimeout(
                        () => reject(new Error('The browser did not return a screenshot in time')),
                        10000,
                    )
                }),
            ])
        } finally {
            clearTimeout(captureTimer)
        }
        const after = (await api.tabs.query({ windowId, active: true }))[0]
        if (after?.id !== tabId || after.url !== loadedUrl || after.status !== 'complete') {
            throw new Error('The capture tab changed')
        }
        const blob = await resizeThumbnail(await (await fetch(image)).blob())
        const link = await captureLink(id, url)
        if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
        await writeThumbnail({ id, url, source: thumbnailSourceKey(link.thumbnail!), image: blob, updated: Date.now() })
    } finally {
        if (windowId !== undefined) {
            const current = await api.windows.get(windowId).catch(() => undefined)
            await api.windows.remove(windowId).catch(() => {})
            if (current?.focused && previousWindow?.id !== undefined) {
                await api.windows.update(previousWindow.id, { focused: true }).catch(() => {})
            }
        }
    }
}
