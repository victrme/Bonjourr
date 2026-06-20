import './init.test.ts'

// Import script after test init, document needs to be loaded first
import { isValidUrl } from '../src/scripts/features/searchbar.ts'
import { assert, assertEquals, assertFalse } from '@std/assert'

type OpenCall = {
    url: string
    target?: string
}

function setSearchbarDom(): void {
    document.body.innerHTML = `
        <form id="sb_container">
            <input id="searchbar" />
            <div id="sb-buttons"></div>
            <button id="sb_empty" type="button"></button>
            <button id="sb_submit" type="submit"></button>
            <ul id="sb-suggestions"></ul>
        </form>
    `
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

Deno.test('Searchbar URL validation rejects auto-prepended dotted non-domains', () => {
    for (
        const value of [
            'https://802.11a',
            'https://802.11,,',
            'https://nginx.conf',
            'https://config.yaml',
            'https://settings.json',
            '802.11',
        ]
    ) {
        assertFalse(isValidUrl(value, false), `${value} should search`)
    }
})

Deno.test('Searchbar URL validation accepts domains and local addresses', () => {
    for (
        const value of [
            'https://example.com',
            'https://www.gov.za',
            'https://github.com/foo',
            'https://sub.example.co.uk',
            'https://localhost',
            'https://192.168.1.1',
            'https://127.0.0.1',
            'https://10.0.0.1',
            'https://172.16.0.1',
            'https://172.31.255.255',
        ]
    ) {
        assert(isValidUrl(value), `${value} should open directly`)
    }
})

Deno.test({
    name: 'Searchbar opens local addresses over http and searches rejected hosts',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        setSearchbarDom()

        const { searchbar } = await import('../src/scripts/features/searchbar.ts?submit-local')
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

            for (
                const [value, expected] of [
                    ['localhost', 'http://localhost'],
                    ['192.168.1.1', 'http://192.168.1.1'],
                    ['127.0.0.1', 'http://127.0.0.1'],
                ]
            ) {
                input.value = value
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                assertEquals(open.calls.at(-1), { url: expected, target: '_self' })
            }

            input.value = 'nginx.conf'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'https://www.google.com/search?q=nginx.conf', target: '_self' })

            form.setAttribute('data-engine', 'custom')
            form.setAttribute('data-request', 'https://search.example.com/?q=%s')
            input.value = 'settings.json'
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            assertEquals(open.calls.at(-1), { url: 'https://search.example.com/?q=settings.json', target: '_self' })
        } finally {
            open.restore()
        }
    },
})
