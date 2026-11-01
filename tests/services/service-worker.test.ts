import { assertEquals } from '@std/assert'
import '../init.ts'

Deno.test('Translation revisions avoid stale files in the web service worker cache', async () => {
    const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
    const originalFetch = globalThis.fetch
    const oldUrl = 'https://example.com/_locales/tr/translations.json?v=old-revision'
    const newUrl = 'https://example.com/_locales/tr/translations.json?v=new-revision'
    const requests: string[] = []
    const added: string[] = []
    const caches = {
        match: (request: Request) =>
            Promise.resolve(
                request.url === oldUrl ? Response.json({ Cloudy: 'Old translation' }) : undefined,
            ),
        open: () =>
            Promise.resolve({
                add: (url: string) => {
                    added.push(url)
                    return Promise.resolve()
                },
            }),
    }
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: caches })
    globalThis.fetch = (input) => {
        const request = input as Request
        requests.push(request.url)
        return Promise.resolve(Response.json({ Cloudy: 'Bulutlu' }))
    }

    try {
        await import('../../src/scripts/services/service-worker.js')

        for (const [url, expected] of [[oldUrl, 'Old translation'], [newUrl, 'Bulutlu']]) {
            let response: Promise<Response> | undefined
            const event = new Event('fetch')
            Object.assign(event, {
                request: new Request(url),
                respondWith: (result: Promise<Response>) => response = result,
            })
            self.dispatchEvent(event)
            assertEquals((await (await response)?.json()).Cloudy, expected)
        }

        assertEquals(requests, [newUrl])
        assertEquals(added, [newUrl])
    } finally {
        if (originalCaches) {
            Object.defineProperty(globalThis, 'caches', originalCaches)
        } else {
            Reflect.deleteProperty(globalThis, 'caches')
        }
        globalThis.fetch = originalFetch
    }
})
