import { assert, assertEquals, assertFalse } from '@std/assert'
import '../init.test.ts'

Deno.test('Searchbar URL validation rejects auto-prepended dotted non-domains', async () => {
    const { isDistantUrl, safeURL } = await import('../../src/scripts/features/searchbar/url.ts')

    const urls = [
        safeURL('https://802.11a'),
        safeURL('https://802.11,,'),
        safeURL('https://nginx.conf'),
        safeURL('https://config.yaml'),
        safeURL('https://settings.json'),
        safeURL('802.11'),
    ]

    for (const url of urls) {
        assertFalse(url && isDistantUrl(url), `${url} should search`)
    }
})

Deno.test('Searchbar URL validation accepts domains and local addresses', async () => {
    const { isDistantUrl, isLocalIp, safeURL } = await import('../../src/scripts/features/searchbar/url.ts')

    const urls = [
        safeURL('https://example.com'),
        safeURL('https://www.gov.za'),
        safeURL('https://github.com/foo'),
        safeURL('https://sub.example.co.uk'),
        safeURL('https://localhost'),
        safeURL('https://192.168.1.1'),
        safeURL('https://127.0.0.1'),
    ]

    for (const url of urls) {
        assert(url && (isLocalIp(url) || isDistantUrl(url)), `${url} should open directly`)
    }
})

Deno.test({
    name: 'Searchbar opens local addresses over http and searches rejected hosts',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        document.body.innerHTML = `
            <form id="sb_container">
                <input id="searchbar" />
                <div id="sb-buttons"></div>
                <button id="sb_empty" type="button"></button>
                <button id="sb_submit" type="submit"></button>
                <ul id="sb-suggestions"></ul>
            </form>
        `

        const { searchbar } = await import('../../src/scripts/features/searchbar/searchbar.ts')
        const form = document.getElementById('sb_container') as HTMLFormElement
        const input = document.getElementById('searchbar') as HTMLInputElement
        const open = mockOpen()

        try {
            searchbar({
                on: true,
                newtab: false,
                engine: 'google',
                request: '',
                suggestions: false,
                placeholder: '',
            })

            input.value = 'localhost'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'http://localhost/', target: '_self' })

            input.value = '192.168.1.1'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'http://192.168.1.1/', target: '_self' })

            input.value = '127.0.0.1'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'http://127.0.0.1/', target: '_self' })

            input.value = 'nginx.conf'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'https://www.google.com/search?q=nginx.conf', target: '_self' })

            input.value = 'settings.json'
            form.setAttribute('data-engine', 'custom')
            form.setAttribute('data-request', 'https://search.example.com/?q=%s')
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'https://search.example.com/?q=settings.json', target: '_self' })
        } finally {
            open.restore()
        }
    },
})

/*
 * Functions
 */

interface OpenCall {
    target?: string
    url: string
}

function mockOpen(): { calls: OpenCall[]; restore: () => void } {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'open')
    const calls: OpenCall[] = []

    Object.defineProperty(globalThis, 'open', {
        configurable: true,
        value: (url?: string | URL, target?: string): null => {
            calls.push({ url: String(url), target })
            return null
        },
    })

    return {
        calls,
        restore: () => {
            if (descriptor) {
                Object.defineProperty(globalThis, 'open', descriptor)
            }
        },
    }
}
