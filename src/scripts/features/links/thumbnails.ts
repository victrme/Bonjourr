import { EXTENSION } from '../../defaults.ts'
import { storage } from '../../storage.ts'
import { tradThis } from '../../utils/translations.ts'
import {
    readThumbnail,
    removeThumbnail,
    resizeThumbnail,
    thumbnailSourceKey,
    thumbnailWebsiteUrl,
    writeThumbnail,
} from '../../shared/thumbnails.ts'
import type { ThumbnailSource } from '../../shared/thumbnails.ts'
import type { LinkElem } from '../../../types/shared.ts'

const attempts = new Set<string>()
const imageUrls = new WeakMap<HTMLImageElement, string>()
let settingsInitialized = false

export function thumbnailStatus(message: string): void {
    for (const id of ['thumbnail-status', 'thumbnail-edit-status']) {
        const status = document.getElementById(id)
        if (status) status.textContent = tradThis(message)
    }
}

export function initThumbnailSettings(): void {
    if (settingsInitialized) return
    settingsInitialized = true
    const help = document.getElementById('thumbnail-capture-help')
    if (help) {
        help.textContent = tradThis(
            'Capture opens temporary website windows and may briefly take focus. It requires access to all websites. Images stay on this device and may contain signed-in content. Choose a thumbnail source when editing a link.',
        )
    }
    new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.removedNodes) {
                if (!(node instanceof HTMLElement)) continue
                for (const image of node.querySelectorAll('img')) {
                    const url = imageUrls.get(image)
                    if (url && !image.isConnected) {
                        URL.revokeObjectURL(url)
                        imageUrls.delete(image)
                    }
                }
            }
        }
    }).observe(document.getElementById('linkblocks')!, { childList: true, subtree: true })
    const toggle = document.getElementById('i_thumbnail-capture') as HTMLInputElement | null
    const option = document.querySelector<HTMLOptionElement>('#e-thumbnail-type option[value="capture"]')
    const canCapture = !!EXTENSION && !EXTENSION.extension.inIncognitoContext
    if (option) option.disabled = !canCapture
    if (toggle) {
        toggle.disabled = !canCapture
        if (canCapture) {
            Promise.all([
                EXTENSION!.storage.local.get('thumbnailCaptureEnabled'),
                EXTENSION!.permissions.contains({ origins: ['<all_urls>'] }),
            ]).then(([local, granted]) => {
                toggle.checked = !!local.thumbnailCaptureEnabled && granted
            })
                .catch(() => {
                    toggle.checked = false
                })
        }
        toggle.addEventListener('change', () => {
            if (!EXTENSION) return
            // Request synchronously from the user gesture, before awaiting storage or any other API.
            const permission = toggle.checked
                ? EXTENSION.permissions.request({ origins: ['<all_urls>'] })
                : Promise.resolve(false)
            toggle.disabled = true
            permission.then(async (granted) => {
                toggle.checked = granted
                await EXTENSION!.storage.local.set({ thumbnailCaptureEnabled: granted })
                if (!granted) await EXTENSION!.permissions.remove({ origins: ['<all_urls>'] })
                attempts.clear()
                thumbnailStatus(granted ? 'Local thumbnail capture enabled' : 'Local thumbnail capture disabled')
                if (granted) refreshVisibleThumbnails()
            }).catch(() => {
                toggle.checked = false
                thumbnailStatus('Could not enable local thumbnail capture')
            }).finally(() => {
                toggle.disabled = false
            })
        })
    }
    document.getElementById('b_thumbnail-clear')?.addEventListener('click', async () => {
        try {
            if (EXTENSION) await sendThumbnailMessage({ type: 'bonjourr-thumbnail-cancel' })
            await removeThumbnail()
            attempts.clear()
            refreshVisibleThumbnails(false)
            thumbnailStatus('Thumbnail cache cleared')
        } catch (_) {
            thumbnailStatus('Could not clear thumbnail cache')
        }
    })
    document.getElementById('edit-thumbnail-refresh')?.addEventListener('click', async () => {
        const button = document.getElementById('edit-thumbnail-refresh') as HTMLButtonElement
        const id = document.querySelector<HTMLLIElement>('.link-elem.selected')?.id
        if (!id) return
        button.disabled = true
        button.setAttribute('aria-busy', 'true')
        try {
            const link = (await storage.sync.get(id))[id] as LinkElem
            if (!link?.thumbnail) throw new Error('Apply the thumbnail source before refreshing')
            await refreshThumbnail(link)
            refreshVisibleThumbnails(false)
            thumbnailStatus('Thumbnail saved locally')
        } catch (error) {
            thumbnailStatus(error instanceof Error ? error.message : 'Could not create thumbnail')
        } finally {
            button.disabled = false
            button.removeAttribute('aria-busy')
        }
    })
}

function refreshVisibleThumbnails(captureMissing = true): void {
    storage.sync.get().then((sync) => {
        if (sync.linkstyle !== 'thumbnails') return
        for (const image of document.querySelectorAll<HTMLImageElement>('.link-elem img')) {
            const id = image.closest('li')?.id ?? ''
            const link = sync[id] as LinkElem | undefined
            if (link) displayThumbnail(image, link, image.dataset.fallback ?? '', captureMissing)
        }
    })
}

export async function displayThumbnail(
    image: HTMLImageElement,
    link: LinkElem,
    fallback: string,
    captureMissing = true,
): Promise<void> {
    const previous = imageUrls.get(image)
    if (previous) URL.revokeObjectURL(previous)
    imageUrls.delete(image)
    image.dataset.fallback = fallback
    image.dataset.thumbnail = 'false'
    image.dataset.thumbnailKey = ''
    image.src = fallback
    image.closest('li')?.removeAttribute('aria-busy')
    const source = link.thumbnail
    if (!source) return
    const key = JSON.stringify([link._id, link.url, thumbnailSourceKey(source)])
    image.dataset.thumbnailKey = key
    try {
        let blob = await readThumbnail(link._id, link.url, source)
        if (!blob && captureMissing && source.type === 'capture' && EXTENSION && !attempts.has(key)) {
            const local = await EXTENSION.storage.local.get('thumbnailCaptureEnabled')
            if (!local.thumbnailCaptureEnabled || EXTENSION.extension.inIncognitoContext) return
            attempts.add(key)
            image.closest('li')?.setAttribute('aria-busy', 'true')
            await refreshThumbnail(link)
            blob = await readThumbnail(link._id, link.url, source)
        }
        if (blob && image.isConnected && image.dataset.thumbnailKey === key) {
            const previous = imageUrls.get(image)
            if (previous) URL.revokeObjectURL(previous)
            const url = URL.createObjectURL(blob)
            imageUrls.set(image, url)
            image.src = url
            image.dataset.thumbnail = 'true'
        }
    } catch (_) {
        thumbnailStatus('Could not create thumbnail. The previous image or favicon is kept.')
    } finally {
        image.closest('li')?.removeAttribute('aria-busy')
    }
}

export async function saveThumbnailSource(
    link: LinkElem,
    source: ThumbnailSource | null,
    file?: File,
    refresh = false,
): Promise<void> {
    if (!source) {
        await removeThumbnail(link._id)
        return
    }
    if (source.type === 'capture') {
        thumbnailWebsiteUrl(link.url)
        return
    }
    if (source.type === 'file' && !file) {
        if (!await readThumbnail(link._id, link.url, source)) throw new Error('Choose a thumbnail image file')
        return
    }
    let image: Blob
    if (source.type === 'url') {
        if (!refresh && await readThumbnail(link._id, link.url, source)) return
        const response = await fetch(thumbnailWebsiteUrl(source.value ?? ''), {
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error('Could not load thumbnail URL. Try a local file instead.')
        image = await response.blob()
    } else {
        image = file!
    }
    if (!image.type.startsWith('image/') || image.size > 8 * 1024 * 1024) {
        throw new Error('Choose an image smaller than 8 MB')
    }
    await writeThumbnail({
        id: link._id,
        url: link.url,
        source: thumbnailSourceKey(source),
        image: await resizeThumbnail(image),
        updated: Date.now(),
    })
}

async function refreshThumbnail(link: LinkElem): Promise<void> {
    if (link.thumbnail?.type === 'capture') {
        if (!EXTENSION || EXTENSION.extension.inIncognitoContext) {
            throw new Error('Local capture is available in regular extension tabs only')
        }
        const message = {
            type: 'bonjourr-thumbnail-capture',
            id: link._id,
            url: link.url,
        }
        const response = await sendThumbnailMessage(message)
        if (!response?.ok) throw new Error(response?.error ?? 'Could not create thumbnail')
    } else if (link.thumbnail?.type === 'url') {
        await saveThumbnailSource(link, link.thumbnail, undefined, true)
    } else {
        throw new Error('Choose a new file to replace this thumbnail')
    }
}

async function sendThumbnailMessage(
    message: { type: string; id?: string; url?: string },
): Promise<{ ok?: boolean; error?: string } | undefined> {
    return typeof browser === 'undefined'
        ? await chrome.runtime.sendMessage(message)
        : await browser.runtime.sendMessage(message)
}
