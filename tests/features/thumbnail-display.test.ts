import { assertEquals } from '@std/assert'
import type { LinkElem } from '../../src/types/shared.ts'

const NativeBlob = globalThis.Blob
await import('../init.ts')
// IndexedDB clones native Blobs; the DOM test library's Blob does not support structured cloning.
globalThis.Blob = NativeBlob
location.href = 'chrome-extension://test-extension/index.html'
let enabled = true
let captureFails = false
let captures = 0
const link: LinkElem = {
    _id: 'links1',
    order: 1,
    title: 'Example',
    url: 'https://example.com/',
    thumbnail: { type: 'capture' },
}

globalThis.chrome = {
    extension: { inIncognitoContext: false },
    storage: { local: { get: () => Promise.resolve({ thumbnailCaptureEnabled: enabled }) } },
    runtime: {
        sendMessage: async () => {
            captures++
            if (captureFails) return { error: 'Capture failed' }
            await writeThumbnail({
                id: link._id,
                url: link.url,
                source: 'capture:',
                image: new Blob([`capture-${captures}`], { type: 'image/jpeg' }),
                updated: captures,
            })
            return { ok: true }
        },
    },
} as unknown as typeof chrome

const { displayThumbnail } = await import('../../src/scripts/features/links/thumbnails.ts')
const { writeThumbnail, readThumbnail, removeThumbnail } = await import('../../src/scripts/shared/thumbnails.ts')
const { tabsBc } = await import('../../src/scripts/defaults.ts')

Deno.test('Saving requests a fresh thumbnail while ordinary display uses the cache', async (test) => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    const originalFetch = globalThis.fetch
    let shown: Blob | undefined
    URL.createObjectURL = (blob) => {
        if (!(blob instanceof Blob)) throw new Error('Expected a thumbnail Blob')
        shown = blob
        return 'blob:thumbnail-test'
    }
    URL.revokeObjectURL = () => {}
    const item = document.createElement('li')
    const image = document.createElement('img')
    item.append(image)
    document.body.replaceChildren(item)
    await writeThumbnail({
        id: link._id,
        url: link.url,
        source: 'capture:',
        image: new Blob(['previous'], { type: 'image/jpeg' }),
        updated: 0,
    })

    try {
        await test.step('Displaying a cached link does not capture again', async () => {
            await displayThumbnail(image, link, 'favicon.png')
            assertEquals(captures, 0)
            assertEquals(await shown?.text(), 'previous')
        })
        await test.step('A new tab with no cached image never starts a capture', async () => {
            const missing = { ...link, _id: 'links-missing' }
            await displayThumbnail(image, missing, 'favicon.png')
            await displayThumbnail(image, missing, 'favicon.png')
            assertEquals(captures, 0)
            assertEquals(image.dataset.thumbnail, 'false')
        })
        await test.step('Each explicit save refreshes an existing screenshot', async () => {
            await displayThumbnail(image, link, 'favicon.png', true)
            assertEquals(captures, 1)
            assertEquals(await shown?.text(), 'capture-1')
            await displayThumbnail(image, link, 'favicon.png', true)
            assertEquals(captures, 2)
            assertEquals(await shown?.text(), 'capture-2')
        })
        await test.step('Saving with capture disabled keeps the cached screenshot', async () => {
            enabled = false
            await displayThumbnail(image, link, 'favicon.png', true)
            assertEquals(captures, 2)
            assertEquals(await shown?.text(), 'capture-2')
            enabled = true
        })
        await test.step('A failed refresh keeps the previous image visible and cached', async () => {
            captureFails = true
            await displayThumbnail(image, link, 'favicon.png', true)
            assertEquals(captures, 3)
            assertEquals(image.dataset.thumbnail, 'true')
            assertEquals(await shown?.text(), 'capture-2')
            assertEquals(await (await readThumbnail(link._id, link.url, link.thumbnail!))?.text(), 'capture-2')
        })
        await test.step('Clearing cache during pending refresh must keep fallback', async () => {
            let release!: () => void
            let started!: () => void
            const entered = new Promise<void>((resolve) => {
                started = resolve
            })
            chrome.runtime.sendMessage = (() =>
                new Promise<{ error: string }>((resolve) => {
                    release = () => resolve({ error: 'Thumbnail capture was cancelled' })
                    started()
                })) as typeof chrome.runtime.sendMessage
            const pending = displayThumbnail(image, link, 'favicon.png', true)
            await entered
            await removeThumbnail()
            await displayThumbnail(image, link, 'favicon.png')
            assertEquals(image.dataset.thumbnail, 'false')
            release()
            await pending
            assertEquals(image.dataset.thumbnail, 'false')
        })
        await test.step('Legacy file and URL sources do not fetch images or use screenshot cache', async () => {
            const source = { type: 'url' as const, value: 'https://example.com/preview.jpg' }
            await writeThumbnail({
                id: link._id,
                url: link.url,
                source: `url:${source.value}`,
                image: new Blob(['previous-url'], { type: 'image/jpeg' }),
                updated: 4,
            })
            let downloads = 0
            globalThis.fetch = () => {
                downloads++
                return Promise.reject(new Error('Download failed'))
            }
            await displayThumbnail(image, { ...link, thumbnail: source }, 'standard-icon.png', true)
            assertEquals(downloads, 0)
            assertEquals(image.dataset.thumbnail, 'false')
            assertEquals(item.dataset.thumbnailSource, undefined)
            assertEquals(image.getAttribute('src'), 'standard-icon.png')
            await displayThumbnail(
                image,
                { ...link, thumbnail: { type: 'file', value: 'old.png' } },
                'standard-file.png',
                true,
            )
            assertEquals(downloads, 0)
            assertEquals(image.dataset.thumbnail, 'false')
            assertEquals(await (await readThumbnail(link._id, link.url, source))?.text(), 'previous-url')
        })
    } finally {
        URL.createObjectURL = originalCreate
        URL.revokeObjectURL = originalRevoke
        globalThis.fetch = originalFetch
        await removeThumbnail()
        tabsBc.close()
    }
})
