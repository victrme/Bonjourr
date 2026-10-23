import { EXTENSION } from '../../defaults.ts'
import { storage } from '../../storage.ts'
import { tradThis } from '../../utils/translations.ts'
import type { thumbnailMessages } from './thumbnail-messages.ts'
import { readThumbnail, removeThumbnail, thumbnailSourceKey } from '../../shared/thumbnails.ts'
import type { LinkElem } from '../../../types/shared.ts'

const imageUrls = new WeakMap<HTMLImageElement, string>()
const imageUpdates = new WeakMap<HTMLImageElement, object>()
let settingsInitialized = false
let displayEnabled = false
let stateRevision = 0

export function thumbnailsEnabled(): boolean {
    return displayEnabled
}

function setThumbnailDisplay(enabled: boolean): void {
    const changed = displayEnabled !== enabled
    displayEnabled = enabled
    const toggle = document.getElementById('i_thumbnail-capture') as HTMLInputElement | null
    if (toggle) toggle.checked = enabled
    document.getElementById('linkblocks')?.classList.toggle('thumbnails', enabled)
    if (changed) document.dispatchEvent(new Event('thumbnail-display-changed'))
}

async function refreshThumbnailSettings(): Promise<void> {
    if (!EXTENSION) return
    const revision = ++stateRevision
    const [local, granted] = await Promise.all([
        EXTENSION.storage.local.get('thumbnailCaptureEnabled'),
        EXTENSION.permissions.contains({ origins: ['<all_urls>'] }),
    ])
    if (revision !== stateRevision) return
    const enabled = !!local.thumbnailCaptureEnabled && granted && !EXTENSION.extension.inIncognitoContext
    const toggle = document.getElementById('i_thumbnail-capture') as HTMLInputElement | null
    if (toggle) toggle.checked = enabled
    setThumbnailDisplay(enabled)
}

export function thumbnailStatus(message: typeof thumbnailMessages[number] | '', cache = false): void {
    const ids = cache ? ['thumbnail-cache-status'] : ['thumbnail-status', 'thumbnail-edit-status']
    for (const id of ids) {
        const status = document.getElementById(id)
        if (!status) continue
        status.classList.remove('thumbnail-status-fade')
        status.textContent = message ? tradThis(message) : ''
        if (!message) continue
        // Restart the display time when another result replaces the previous message.
        void status.offsetWidth
        status.classList.add('thumbnail-status-fade')
        status.onanimationend = (event) => {
            if (event.target !== status || event.animationName !== 'thumbnail-status-fade') return
            status.textContent = ''
            status.classList.remove('thumbnail-status-fade')
        }
    }
}

export async function initThumbnailSettings(): Promise<void> {
    if (settingsInitialized) return
    settingsInitialized = true
    EXTENSION?.runtime.onMessage.addListener((message, sender) => {
        if (sender.id === EXTENSION?.runtime.id && message?.type === 'bonjourr-thumbnail-updated') {
            refreshVisibleThumbnails()
        }
    })
    const help = document.getElementById('thumbnail-capture-help')
    if (help) {
        help.textContent = tradThis(
            'Capture opens temporary website windows and may briefly take focus. It requires access to all websites. Images stay on this device and may contain signed-in content. When editing a link, select Thumbnail under Icon, then apply changes.',
        )
    }
    const helpContent = document.getElementById('thumbnail-help-content')
    if (helpContent) {
        // A numeric height preserves the dropdown transition without clipping longer translations.
        new ResizeObserver(() => {
            document.getElementById('thumbnail-help')?.style.setProperty(
                '--thumbnail-help-height',
                `${helpContent.offsetHeight}px`,
            )
        }).observe(helpContent)
    }
    const settings = document.getElementById('thumbnail-settings')
    const helpPanel = document.getElementById('thumbnail-help')
    if (settings && helpPanel && helpContent) {
        // Reserve the full help height so its animation does not restart the parent dropdown transitions.
        const observer = new ResizeObserver(() => {
            const height = settings.getBoundingClientRect().height - helpPanel.getBoundingClientRect().height +
                helpContent.getBoundingClientRect().height
            document.getElementById('quicklinks_options')?.style.setProperty(
                '--thumbnail-settings-height',
                `${Math.round(height)}px`,
            )
        })
        observer.observe(settings)
        observer.observe(helpContent)
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
    const option = document.querySelector<HTMLOptionElement>('#e-icon-type option[value="capture"]')
    const canCapture = !!EXTENSION && !EXTENSION.extension.inIncognitoContext
    if (option) option.disabled = !canCapture
    if (toggle) {
        toggle.disabled = true
        toggle.addEventListener('change', () => {
            if (!EXTENSION) return
            thumbnailStatus('')
            // Request synchronously from the user gesture, before awaiting storage or any other API.
            const permission = toggle.checked
                ? EXTENSION.permissions.request({ origins: ['<all_urls>'] })
                : Promise.resolve(false)
            toggle.disabled = true
            permission.then(async (granted) => {
                await EXTENSION!.storage.local.set({ thumbnailCaptureEnabled: granted })
                if (!granted) {
                    setThumbnailDisplay(false)
                    await sendThumbnailMessage({ type: 'bonjourr-thumbnail-cancel' })
                    await EXTENSION!.permissions.remove({ origins: ['<all_urls>'] })
                }
                await refreshThumbnailSettings()
            }).catch(async () => {
                toggle.checked = false
                setThumbnailDisplay(false)
                // Storage may also be unavailable during recovery; still show the original failure.
                await EXTENSION!.storage.local.set({ thumbnailCaptureEnabled: false }).catch(() => {})
                thumbnailStatus('Could not change the thumbnail capture setting')
            }).finally(() => {
                toggle.disabled = false
            })
        })
    }
    EXTENSION?.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.thumbnailCaptureEnabled) {
            refreshThumbnailSettings().catch(() => setThumbnailDisplay(false))
        }
    })
    EXTENSION?.permissions.onRemoved.addListener(() => {
        refreshThumbnailSettings().catch(() => setThumbnailDisplay(false))
    })
    EXTENSION?.permissions.onAdded.addListener(() => {
        refreshThumbnailSettings().catch(() => setThumbnailDisplay(false))
    })
    document.getElementById('b_thumbnail-clear')?.addEventListener('click', async () => {
        thumbnailStatus('', true)
        try {
            if (EXTENSION) await sendThumbnailMessage({ type: 'bonjourr-thumbnail-cancel' })
            await removeThumbnail()
            refreshVisibleThumbnails()
            // Other Bonjourr tabs may still display object URLs for the deleted images.
            if (EXTENSION) {
                await sendThumbnailMessage({ type: 'bonjourr-thumbnail-updated' }).catch(() => {})
            }
            thumbnailStatus('Thumbnail cache cleared', true)
        } catch (_) {
            thumbnailStatus('Could not clear thumbnail cache', true)
        }
    })
    try {
        if (canCapture) await refreshThumbnailSettings()
    } catch (_) {
        setThumbnailDisplay(false)
    } finally {
        if (toggle) toggle.disabled = !canCapture
    }
}

function refreshVisibleThumbnails(): void {
    storage.sync.get().then((sync) => {
        if (!displayEnabled || sync.linkstyle === 'text') return
        for (const image of document.querySelectorAll<HTMLImageElement>('.link-elem img')) {
            const id = image.closest('li')?.id ?? ''
            const link = sync[id] as LinkElem | undefined
            if (link?.thumbnail?.type === 'capture') displayThumbnail(image, link, image.dataset.fallback ?? '')
        }
    })
}

export async function displayThumbnail(
    image: HTMLImageElement,
    link: LinkElem,
    fallback: string,
    refreshCapture = false,
): Promise<void> {
    const update = {}
    imageUpdates.set(image, update)
    const previous = imageUrls.get(image)
    if (previous) URL.revokeObjectURL(previous)
    imageUrls.delete(image)
    image.dataset.fallback = fallback
    image.dataset.thumbnail = 'false'
    image.dataset.thumbnailKey = ''
    image.src = fallback
    image.closest('li')?.removeAttribute('aria-busy')
    image.closest('li')?.removeAttribute('data-thumbnail-source')
    const source = link.thumbnail
    if (source?.type !== 'capture') return
    image.closest('li')?.setAttribute('data-thumbnail-source', 'capture')
    const key = JSON.stringify([link._id, link.url, thumbnailSourceKey(source)])
    image.dataset.thumbnailKey = key
    let blob: Blob | undefined
    try {
        blob = await readThumbnail(link._id, link.url, source)
        if (refreshCapture && source.type === 'capture' && EXTENSION) {
            const local = await EXTENSION.storage.local.get('thumbnailCaptureEnabled')
            if (imageUpdates.get(image) !== update || !image.isConnected) return
            if (!local.thumbnailCaptureEnabled || EXTENSION.extension.inIncognitoContext) return
            image.closest('li')?.setAttribute('aria-busy', 'true')
            await refreshThumbnail(link)
            blob = await readThumbnail(link._id, link.url, source)
        }
    } catch (error) {
        if (imageUpdates.get(image) === update && image.isConnected && image.dataset.thumbnailKey === key) {
            console.warn('Thumbnail capture failed', error)
            thumbnailStatus('Could not create thumbnail. The previous image or favicon is kept.')
        }
    } finally {
        const current = imageUpdates.get(image) === update && image.isConnected && image.dataset.thumbnailKey === key
        if (blob && current) {
            const previous = imageUrls.get(image)
            if (previous) URL.revokeObjectURL(previous)
            const url = URL.createObjectURL(blob)
            imageUrls.set(image, url)
            image.src = url
            image.dataset.thumbnail = 'true'
        }
        if (current) image.closest('li')?.removeAttribute('aria-busy')
    }
}

async function refreshThumbnail(link: LinkElem): Promise<void> {
    const message = {
        type: 'bonjourr-thumbnail-capture',
        id: link._id,
        url: link.url,
    }
    const response = await sendThumbnailMessage(message)
    if (!response?.ok) throw new Error(response?.error ?? 'Thumbnail capture failed')
}

async function sendThumbnailMessage(
    message: { type: string; id?: string; url?: string },
): Promise<{ ok?: boolean; error?: string } | undefined> {
    return typeof browser === 'undefined'
        ? await chrome.runtime.sendMessage(message)
        : await browser.runtime.sendMessage(message)
}
