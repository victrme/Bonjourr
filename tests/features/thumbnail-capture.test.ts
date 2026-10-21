import { assertEquals, assertRejects } from '@std/assert'

const events: string[] = []
let granted = true
let enabled = true
let currentUrl = 'https://example.com/'
let createCount = 0
let listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]

globalThis.chrome = {
    runtime: {
        id: 'test-extension',
        getURL: (path: string) => `chrome-extension://test-extension/${path}`,
        onMessage: {
            addListener: (callback: typeof listener) => {
                listener = callback
            },
        },
    },
    storage: {
        local: { get: () => Promise.resolve({ thumbnailCaptureEnabled: enabled }) },
        sync: {
            get: () => Promise.resolve({ links1: { _id: 'links1', url: currentUrl, thumbnail: { type: 'capture' } } }),
        },
    },
    permissions: { contains: () => Promise.resolve(granted) },
    windows: {
        getLastFocused: () => Promise.resolve({ id: 1 }),
        get: () => Promise.resolve({ id: 10, focused: false }),
        create: () => {
            createCount++
            events.push('create')
            return Promise.resolve({ id: 10, tabs: [{ id: 11 }] })
        },
        remove: () => {
            events.push('close')
            return Promise.resolve()
        },
    },
    tabs: {
        update: () => Promise.resolve({}),
        get: () => Promise.reject(new Error('Website tab was closed')),
    },
} as unknown as typeof chrome

const { enqueueCapture, registerThumbnailCapture } = await import('../../src/scripts/services/thumbnail-capture.ts')
registerThumbnailCapture()

Deno.test('Capture requires both local opt-in and all-sites permission', async () => {
    enabled = false
    await assertRejects(() => enqueueCapture('links1', currentUrl), Error, 'Enable local thumbnail capture')
    enabled = true
    granted = false
    await assertRejects(() => enqueueCapture('links1', currentUrl), Error, 'Enable local thumbnail capture')
    assertEquals(createCount, 0)
    granted = true
})

Deno.test('Capture rejects changed links and unsupported URLs before opening a window', async () => {
    await assertRejects(() => enqueueCapture('links1', 'https://old.example/'), Error, 'link changed')
    currentUrl = 'file:///tmp/private'
    await assertRejects(() => enqueueCapture('links1', currentUrl), Error, 'Only HTTP and HTTPS')
    assertEquals(createCount, 0)
    currentUrl = 'https://example.com/'
})

Deno.test('Duplicate capture requests share a job and failures close their window', async () => {
    const first = enqueueCapture('links1', currentUrl)
    const second = enqueueCapture('links1', currentUrl)
    assertEquals(first, second)
    await assertRejects(() => first, Error, 'Website tab was closed')
    assertEquals(events, ['create', 'close'])
})

Deno.test('The capture queue continues after a failed job', async () => {
    await assertRejects(() => enqueueCapture('links1', currentUrl), Error, 'Website tab was closed')
    assertEquals(events, ['create', 'close', 'create', 'close'])
})

Deno.test('Capture messages reject other pages and private tabs', () => {
    for (
        const sender of [
            { id: 'other-extension', url: 'chrome-extension://test-extension/index.html' },
            { id: 'test-extension', url: 'https://example.com/' },
            { id: 'test-extension', url: 'chrome-extension://test-extension/index.html', tab: { incognito: true } },
        ]
    ) {
        let reply: { error?: string } | undefined
        listener(
            { type: 'bonjourr-thumbnail-capture', id: 'links1', url: currentUrl },
            sender as chrome.runtime.MessageSender,
            (value) => {
                reply = value
            },
        )
        assertEquals(reply?.error?.includes('regular Bonjourr tab'), true)
    }
})

Deno.test('Cache cancellation discards jobs that have not opened a window', async () => {
    const before = createCount
    const job = enqueueCapture('links1', currentUrl)
    let reply: { ok?: boolean } | undefined
    listener({ type: 'bonjourr-thumbnail-cancel' }, {
        id: 'test-extension',
        url: 'chrome-extension://test-extension/index.html',
    }, (value) => {
        reply = value
    })
    assertEquals(reply?.ok, true)
    await assertRejects(() => job, Error, 'cancelled')
    assertEquals(createCount, before)
})
