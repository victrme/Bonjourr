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
        enqueueCapture(message.id, message.url, sender.tab).then(
            () => reply({ ok: true }),
            (error: Error) => reply({ error: error.message }),
        )
        return true
    })
}

export function enqueueCapture(id: string, url: string, sourceTab?: chrome.tabs.Tab): Promise<void> {
    const generation = queueGeneration
    const key = JSON.stringify([id, url, generation])
    const existing = pending.get(key)
    if (existing) return existing
    if (pending.size >= 20) return Promise.reject(new Error('The thumbnail queue is full. Try again later.'))
    const job = queue.then(() => captureThumbnail(id, url, generation, sourceTab))
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

async function captureThumbnail(
    id: string,
    url: string,
    generation: number,
    sourceTab?: chrome.tabs.Tab,
): Promise<void> {
    await captureLink(id, url)
    if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
    const original = sourceTab ?? (await api.tabs.query({ active: true, lastFocusedWindow: true }))[0]
    if (original?.id === undefined || original.windowId === undefined) {
        throw new Error('The capture tab changed before the request started')
    }
    const previousWindow = await api.windows.get(original.windowId)
    let windowId: number | undefined
    try {
        const selected = (await api.tabs.query({ windowId: original.windowId, active: true }))[0]
        if (!previousWindow.focused || selected?.id !== original.id) {
            throw new Error('The capture tab changed before opening the website')
        }
        // A popup may ignore the minimized state on Windows. Use a regular window without requesting focus.
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
            const current = await api.tabs.get(tabId)
            if (current.status !== 'complete' || current.url !== loadedUrl) {
                loadedAt = 0
                loadedUrl = current.url ?? ''
            }
            if (current.status === 'complete' && !loadedAt) loadedAt = Date.now()
            if (loadedAt && Date.now() - loadedAt >= 3000) break
            await new Promise((resolve) => setTimeout(resolve, 250))
        }
        if (!loadedAt || Date.now() >= deadline) throw new Error('The website took too long to load')
        thumbnailWebsiteUrl(loadedUrl)
        await captureLink(id, url)
        const previous = await api.windows.get(original.windowId)
        const selectedBeforeRestore = (await api.tabs.query({ windowId: original.windowId, active: true }))[0]
        // Do not restore a capture window over another application or a tab the user selected while loading.
        if (!previous.focused || selectedBeforeRestore?.id !== original.id) {
            throw new Error('The capture tab changed while the website was loading')
        }
        if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
        // Keep the loaded viewport: resizing during restoration can stall readback on complex websites.
        await api.windows.update(windowId, {
            state: 'normal',
            focused: false,
        })
        // On Windows, focused:false can deactivate both windows during restoration.
        const focusedAfterRestore = (await api.windows.getAll()).find((window) => window.focused)
        if (!focusedAfterRestore || focusedAfterRestore.id === windowId) {
            await api.windows.update(original.windowId, { focused: true })
        }
        // Restoring can briefly activate the native window even with focused:false. Allow it to paint once.
        await new Promise((resolve) => setTimeout(resolve, 500))
        if ((await api.windows.get(windowId)).state !== 'normal') throw new Error('Cannot restore capture window')
        // A restored page may reload or redirect when it becomes visible. Wait in the background for it to settle.
        const renderDeadline = Date.now() + 10000
        let readyAt = 0
        let readyUrl = loadedUrl
        while (Date.now() < renderDeadline) {
            if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
            const current = await api.tabs.get(tabId)
            if (current.status !== 'complete' || current.url !== readyUrl) {
                readyAt = 0
                readyUrl = current.url ?? ''
            }
            if (current.status === 'complete' && !readyAt) readyAt = Date.now()
            if (readyAt && Date.now() - readyAt >= 500) break
            await new Promise((resolve) => setTimeout(resolve, 100))
        }
        if (!readyAt || Date.now() >= renderDeadline) throw new Error('The website took too long to load')
        thumbnailWebsiteUrl(readyUrl)
        const before = (await api.tabs.query({ windowId, active: true }))[0]
        if (before?.id !== tabId || before.url !== readyUrl || before.status !== 'complete') {
            throw new Error('The capture tab changed before taking the screenshot')
        }
        const image = await captureVisibleWindow(windowId)
        const after = (await api.tabs.query({ windowId, active: true }))[0]
        if (after?.id !== tabId || after.url !== readyUrl || after.status !== 'complete') {
            throw new Error('The capture tab changed while taking the screenshot')
        }
        const blob = await resizeThumbnail(await (await fetch(image)).blob())
        const link = await captureLink(id, url)
        if (generation !== queueGeneration) throw new Error('Thumbnail capture was cancelled')
        await writeThumbnail({ id, url, source: thumbnailSourceKey(link.thumbnail!), image: blob, updated: Date.now() })
        await api.runtime.sendMessage({ type: 'bonjourr-thumbnail-updated', id, url }).catch(() => {})
    } finally {
        if (windowId !== undefined) {
            const current = await api.windows.get(windowId).catch(() => undefined)
            const previous = await api.windows.get(original.windowId).catch(() => undefined)
            // Transfer focus before closing an active capture window. Leave other applications/windows alone.
            if (current?.focused && previous && previous.state !== 'minimized') {
                await api.windows.update(original.windowId, { focused: true }).catch(() => {})
            }
            await api.windows.remove(windowId).catch(() => {})
        }
    }
}

async function captureVisibleWindow(windowId: number): Promise<string> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            api.tabs.captureVisibleTab(windowId, { format: 'png' }),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('The browser did not return a screenshot in time')), 10000)
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}
