import { assertEquals } from '@std/assert'
import '../init.ts'

document.body.innerHTML = `
    <main id="interface"></main>
    <dialog id="contextmenu"></dialog>
    <button id="b_interface-quotes-refresh"></button>
    <form id="sb_container">
        <input id="searchbar" />
        <div id="sb-buttons">
            <button id="sb_empty" disabled></button>
            <button id="sb_submit" disabled></button>
        </div>
        <button id="sb_voice" class="hidden"></button>
    </form>
`

const { searchbar, startVoiceSearch, abortVoiceSearch } = await import('../../src/scripts/features/searchbar.ts')
const { storage } = await import('../../src/scripts/storage.ts')
const { SYNC_DEFAULT } = await import('../../src/scripts/defaults.ts')

storage.type.init()
await storage.sync.set(SYNC_DEFAULT)

searchbar()

Deno.test({
    name: 'Search opens results in a new tab without an opener',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        assertEquals(submitSearch('bonjourr', true), [
            ['https://duckduckgo.com/?q=bonjourr', '_blank', 'noopener'],
        ])
    },
})

Deno.test({
    name: 'Search opens results in the current tab without new-tab features',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        assertEquals(submitSearch('bonjourr', false), [
            ['https://duckduckgo.com/?q=bonjourr', '_self'],
        ])
    },
})

Deno.test({
    name: 'Search opens bare domains in a new tab without an opener',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        assertEquals(submitSearch('example.com', true), [
            ['https://example.com', '_blank', 'noopener'],
        ])
    },
})

Deno.test({
    name: 'Search does not open a page for empty input',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        assertEquals(submitSearch('', true), [])
    },
})

Deno.test({
    name: 'Voice search button visibility and language settings update container dataset',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const container = document.getElementById('sb_container') as HTMLFormElement
        const voiceButton = document.getElementById('sb_voice') as HTMLButtonElement

        searchbar(undefined, { voice: true, voiceLang: 'ru-RU' })
        await new Promise((resolve) => setTimeout(resolve, 20))
        assertEquals(container.dataset.voice, 'true')
        assertEquals(container.dataset.voicelang, 'ru-RU')
        assertEquals(voiceButton.classList.contains('hidden'), false)

        searchbar(undefined, { voice: false })
        await new Promise((resolve) => setTimeout(resolve, 20))
        assertEquals(container.dataset.voice, 'false')
        assertEquals(voiceButton.classList.contains('hidden'), true)
    },
})

Deno.test({
    name: 'Voice search updates input with recognized speech and handles abort',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const input = document.getElementById('searchbar') as HTMLInputElement
        const voiceButton = document.getElementById('sb_voice') as HTMLButtonElement
        input.value = 'hello'

        let mockInstance: any
        class MockSpeechRecognition {
            continuous = false
            interimResults = true
            lang = ''
            onstart: (() => void) | null = null
            onresult: ((ev: any) => void) | null = null
            onerror: ((ev: any) => void) | null = null
            onend: (() => void) | null = null

            constructor() {
                mockInstance = this
            }

            start() {
                setTimeout(() => {
                    this.onstart?.()
                }, 0)
            }

            stop() {
                setTimeout(() => {
                    this.onend?.()
                }, 0)
            }

            abort() {
                setTimeout(() => {
                    this.onend?.()
                }, 0)
            }
        }

        ;(globalThis as any).webkitSpeechRecognition = MockSpeechRecognition

        await startVoiceSearch()
        await new Promise((resolve) => setTimeout(resolve, 10))

        assertEquals(voiceButton.classList.contains('listening'), true)
        assertEquals(input.getAttribute('placeholder'), 'Listening...')

        // Simulate speech recognition result
        mockInstance.onresult?.({
            resultIndex: 0,
            results: [
                [{ transcript: 'world' }],
            ],
        })

        assertEquals(input.value, 'hello world')
        assertEquals(document.getElementById('sb-buttons')?.classList.contains('shown'), true)
        assertEquals(document.getElementById('sb_empty')?.hasAttribute('disabled'), false)
        assertEquals(document.getElementById('sb_submit')?.hasAttribute('disabled'), false)

        // Abort voice search
        abortVoiceSearch()
        await new Promise((resolve) => setTimeout(resolve, 10))

        assertEquals(voiceButton.classList.contains('listening'), false)
        assertEquals(input.value, 'hello') // restored to initial value before voice search
    },
})

/*
 * Functions
 */

function submitSearch(value: string, newtab: boolean): unknown[][] {
    const container = document.getElementById('sb_container') as HTMLFormElement
    const input = document.getElementById('searchbar') as HTMLInputElement
    const calls: unknown[][] = []
    const originalOpen = globalThis.open

    container.dataset.engine = 'ddg'
    container.dataset.newtab = newtab.toString()
    input.value = value
    globalThis.open = ((...args: unknown[]) => {
        calls.push(args)
        return null
    }) as typeof globalThis.open

    try {
        container.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    } finally {
        globalThis.open = originalOpen
    }

    return calls
}
