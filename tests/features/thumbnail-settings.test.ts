import { assertEquals } from '@std/assert'
const NativeBlob = globalThis.Blob
await import('../init.ts')
globalThis.Blob = NativeBlob

location.href = 'chrome-extension://test-extension/index.html'
let enabled = false
let granted = false
let nextGrant = false
let requests = 0
let cancellations = 0
let storageFails = false
let failedWrites = 0
let cacheNotifications = 0
let notificationCacheEmpty = false
let messageListener: (message: unknown, sender: unknown) => void
const localListeners: ((changes: unknown, area: string) => void)[] = []
const addedListeners: (() => void)[] = []
const removedListeners: (() => void)[] = []

globalThis.chrome = {
    extension: { inIncognitoContext: false },
    storage: {
        local: {
            get: () => Promise.resolve({ thumbnailCaptureEnabled: enabled }),
            set: (data: { thumbnailCaptureEnabled: boolean }) => {
                if (storageFails) {
                    failedWrites++
                    return Promise.reject(new Error('Storage unavailable'))
                }
                enabled = data.thumbnailCaptureEnabled
                for (const listener of localListeners) {
                    listener({ thumbnailCaptureEnabled: { newValue: enabled } }, 'local')
                }
                return Promise.resolve()
            },
        },
        onChanged: { addListener: (listener: typeof localListeners[number]) => localListeners.push(listener) },
    },
    permissions: {
        contains: () => Promise.resolve(granted),
        request: () => {
            requests++
            granted = nextGrant
            if (granted) { for (const listener of addedListeners) listener() }
            return Promise.resolve(granted)
        },
        remove: () => {
            granted = false
            for (const listener of removedListeners) listener()
            return Promise.resolve(true)
        },
        onAdded: { addListener: (listener: () => void) => addedListeners.push(listener) },
        onRemoved: { addListener: (listener: () => void) => removedListeners.push(listener) },
    },
    runtime: {
        id: 'test-extension',
        onMessage: { addListener: (listener: typeof messageListener) => messageListener = listener },
        sendMessage: async (message: { type: string }) => {
            if (message.type === 'bonjourr-thumbnail-cancel') cancellations++
            if (message.type === 'bonjourr-thumbnail-updated') {
                cacheNotifications++
                notificationCacheEmpty =
                    await readThumbnail('links1', 'https://example.com/', { type: 'capture' }) === undefined
            }
            return { ok: true }
        },
    },
} as unknown as typeof chrome

const { initThumbnailSettings, thumbnailsEnabled } = await import('../../src/scripts/features/links/thumbnails.ts')
const { tabsBc } = await import('../../src/scripts/defaults.ts')
const { readThumbnail, writeThumbnail } = await import('../../src/scripts/shared/thumbnails.ts')
const { storage } = await import('../../src/scripts/storage.ts')

Deno.test('Thumbnail switch controls display and retries optional permission after denial', async (test) => {
    document.body.innerHTML = '<div id="linkblocks" class="medium"></div>' +
        '<p id="thumbnail-status"></p><p id="thumbnail-edit-status"></p>' +
        '<button id="b_thumbnail-clear"></button><p id="thumbnail-cache-status"></p>' +
        '<input id="i_thumbnail-capture" type="checkbox"><select id="e-icon-type"><option value="capture">Thumbnail</option></select>'
    const toggle = document.getElementById('i_thumbnail-capture') as HTMLInputElement
    const blocks = document.getElementById('linkblocks')!
    const change = async (checked: boolean, expectedStatus = ''): Promise<void> => {
        document.getElementById('thumbnail-status')!.textContent = 'Previous status'
        document.getElementById('thumbnail-edit-status')!.textContent = 'Previous status'
        toggle.checked = checked
        toggle.dispatchEvent(new Event('change'))
        for (let i = 0; i < 100; i++) {
            await Promise.resolve()
            if (!toggle.disabled) {
                assertEquals(document.getElementById('thumbnail-status')!.textContent, expectedStatus)
                assertEquals(document.getElementById('thumbnail-edit-status')!.textContent, expectedStatus)
                return
            }
        }
        throw new Error('Thumbnail switch did not settle')
    }
    try {
        await initThumbnailSettings()
        await test.step('Initially off with no automatic permission request', () => {
            assertEquals(toggle.checked, false)
            assertEquals(thumbnailsEnabled(), false)
            assertEquals(requests, 0)
        })
        await test.step('Deny leaves the switch and thumbnail display off', async () => {
            await change(true)
            assertEquals(requests, 1)
            assertEquals(toggle.checked, false)
            assertEquals(enabled, false)
            assertEquals(blocks.classList.contains('thumbnails'), false)
        })
        await test.step('Another click requests again and Allow enables display', async () => {
            nextGrant = true
            await change(true)
            assertEquals(requests, 2)
            assertEquals(toggle.checked, true)
            assertEquals(enabled, true)
            assertEquals(thumbnailsEnabled(), true)
            assertEquals(blocks.classList.contains('thumbnails'), true)
            assertEquals(blocks.classList.contains('medium'), true)
        })
        await test.step('Turning off disables display and active access', async () => {
            await change(false)
            assertEquals(toggle.checked, false)
            assertEquals(thumbnailsEnabled(), false)
            assertEquals(granted, false)
            assertEquals(blocks.classList.contains('thumbnails'), false)
            assertEquals(blocks.classList.contains('medium'), true)
            assertEquals(cancellations > 0, true)
            assertEquals(requests, 2)
        })
        await test.step('Enabling again requests access without forgetting the chosen size', async () => {
            await change(true)
            assertEquals(requests, 3)
            assertEquals(toggle.checked, true)
            assertEquals(blocks.classList.contains('thumbnails'), true)
            assertEquals(blocks.classList.contains('medium'), true)
        })
        await test.step('Revoking permission also turns off the switch and display', async () => {
            granted = false
            for (const listener of removedListeners) listener()
            for (let i = 0; i < 20; i++) await Promise.resolve()
            assertEquals(toggle.checked, false)
            assertEquals(thumbnailsEnabled(), false)
            assertEquals(blocks.classList.contains('thumbnails'), false)
        })
        await test.step('Repeated storage failures still show the error and unlock the switch', async () => {
            storageFails = true
            await change(true, 'Could not enable local thumbnail capture')
            assertEquals(failedWrites, 2)
            assertEquals(toggle.checked, false)
            assertEquals(thumbnailsEnabled(), false)
            assertEquals(toggle.disabled, false)
            storageFails = false
        })
        await test.step('Cache clearing notifies other tabs only after deleting images', async () => {
            const originalGet = storage.sync.get
            storage.sync.get = () => Promise.resolve({} as Awaited<ReturnType<typeof originalGet>>)
            try {
                await writeThumbnail({
                    id: 'links1',
                    url: 'https://example.com/',
                    source: 'capture:',
                    image: new Blob(['cached'], { type: 'image/jpeg' }),
                    updated: 1,
                })
                document.getElementById('b_thumbnail-clear')!.click()
                const status = document.getElementById('thumbnail-cache-status')!
                for (let i = 0; i < 100 && !status.textContent; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 5))
                }
                assertEquals(status.textContent, 'Thumbnail cache cleared')
                assertEquals(cacheNotifications, 1)
                assertEquals(notificationCacheEmpty, true)
            } finally {
                storage.sync.get = originalGet
            }
        })
        await test.step('A receiving tab replaces its stale thumbnail with the fallback', async () => {
            await change(true)
            const originalGet = storage.sync.get
            storage.sync.get = () =>
                Promise.resolve({
                    links1: {
                        _id: 'links1',
                        title: 'Example',
                        order: 1,
                        url: 'https://example.com/',
                        thumbnail: { type: 'capture' },
                    },
                } as unknown as Awaited<ReturnType<typeof originalGet>>)
            blocks.innerHTML =
                '<li id="links1" class="link-elem"><img src="blob:stale" data-fallback="favicon.png" data-thumbnail="true"></li>'
            try {
                messageListener({ type: 'bonjourr-thumbnail-updated' }, { id: 'test-extension' })
                const image = blocks.querySelector('img')!
                for (let i = 0; i < 100 && image.dataset.thumbnail !== 'false'; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 5))
                }
                assertEquals(image.getAttribute('src'), 'favicon.png')
                assertEquals(image.dataset.thumbnail, 'false')
                // Let the asynchronous IndexedDB read complete before restoring the test state.
                await readThumbnail('links1', 'https://example.com/', { type: 'capture' })
            } finally {
                storage.sync.get = originalGet
            }
        })
    } finally {
        tabsBc.close()
    }
})
