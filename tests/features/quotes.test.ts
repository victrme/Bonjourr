import { assertEquals } from '@std/assert'
import '../init.ts'

import type { Local } from '../../src/types/local.ts'
import type { Sync } from '../../src/types/sync.ts'

document.body.innerHTML = `
    <main id="interface">
        <div id="quotes_container" class="hidden">
            <span id="quote"></span>
            <span id="author"></span>
        </div>
    </main>
    <dialog id="contextmenu"></dialog>
    <button id="b_interface-quotes-refresh"></button>
    <input id="i_time" type="checkbox" />
    <input id="i_main" type="checkbox" />
    <input id="i_quicklinks" type="checkbox" />
    <input id="i_notes" type="checkbox" />
    <input id="i_quotes" type="checkbox" />
    <input id="i_pomodoro" type="checkbox" />
    <input id="i_sb" type="checkbox" />
`

const { quotes } = await import('../../src/scripts/features/quotes.ts')
const { toggleWidget } = await import('../../src/scripts/features/move/widgets.ts')
const { updateMoveElement } = await import('../../src/scripts/features/move/index.ts')
const { defaultLayouts } = await import('../../src/scripts/features/move/helpers.ts')
const { SYNC_DEFAULT, LOCAL_DEFAULT } = await import('../../src/scripts/defaults.ts')
const { storage } = await import('../../src/scripts/storage.ts')

const container = document.getElementById('quotes_container') as HTMLElement
const quote = document.getElementById('quote') as HTMLElement
const author = document.getElementById('author') as HTMLElement
const fetchedQuotes = [
    { content: 'First quote', author: 'First author' },
    { content: 'Second quote', author: 'Second author' },
    { content: 'Third quote', author: 'Third author' },
]

for (const cacheSize of [0, 1, 2]) {
    testQuotes(
        `Disabled quotes do not fetch or advance a cache of ${cacheSize} quotes`,
        async (sync, local, requests) => {
            sync.quotes.last = 0
            local.quotesCache = structuredClone(fetchedQuotes.slice(0, cacheSize))
            await storage.sync.set(sync)
            storage.local.set(local)

            await quotes({ sync, local })

            assertEquals(requests, [])
            assertEquals((await storage.local.get('quotesCache')).quotesCache, fetchedQuotes.slice(0, cacheSize))
            assertEquals((await storage.sync.get('quotes')).quotes.last, 0)
            assertEquals(container.classList.contains('hidden'), true)
            assertEquals(quote.textContent, '')
        },
    )
}

testQuotes('Enabled quotes fetch and render on startup', async (sync, local, requests) => {
    sync.quotes.on = true

    await quotes({ sync, local })

    assertEquals(requests, ['https://services.bonjourr.fr/quotes/classic/en'])
    assertEquals(quote.textContent, 'First quote')
    assertEquals(author.textContent, 'First author')
    assertEquals(container.classList.contains('hidden'), false)
})

testQuotes('Enabled user quotes render without a request', async (sync, local, requests) => {
    sync.quotes.on = true
    sync.quotes.type = 'user'
    sync.quotes.userlist = 'Local author, Local quote'

    await quotes({ sync, local })

    assertEquals(requests, [])
    assertEquals(quote.textContent, 'Local quote')
    assertEquals(author.textContent, 'Local author')
})

testQuotes(
    'Quotes load when enabled without a reload and reuse their cache when re-enabled',
    async (sync, local, requests) => {
        await quotes({ sync, local })
        assertEquals(requests, [])

        toggleWidget(sync, ['quotes', true])
        await finishTransition()

        assertEquals(requests.length, 1)
        assertEquals(quote.textContent, 'First quote')
        assertEquals(container.classList.contains('hidden'), false)

        toggleWidget(await storage.sync.get(), ['quotes', false])
        await finishTransition()

        assertEquals(container.classList.contains('hidden'), true)
        assertEquals(requests.length, 1)

        toggleWidget(await storage.sync.get(), ['quotes', true])
        await finishTransition()

        assertEquals(container.classList.contains('hidden'), false)
        assertEquals(quote.textContent, 'First quote')
        assertEquals(requests.length, 1)
    },
)

testQuotes(
    'Layout changes load newly enabled quotes without advancing quotes that stay enabled',
    async (sync, local, requests) => {
        sync.quotes.frequency = 'tabs'
        sync.move.layouts = {
            single: { grid: [['time']], items: structuredClone(defaultLayouts.single.items) },
            double: { grid: [['time', '.'], ['quotes', '.']], items: structuredClone(defaultLayouts.double.items) },
            triple: {
                grid: [['time', '.', '.'], ['quotes', '.', '.']],
                items: structuredClone(defaultLayouts.triple.items),
            },
        }
        await storage.sync.set(sync)
        await quotes({ sync, local })
        assertEquals(requests, [])

        await updateMoveElement({ layout: 'double' })
        await finishTransition()

        assertEquals(requests.length, 1)
        assertEquals(quote.textContent, 'Second quote')
        assertEquals(container.classList.contains('hidden'), false)

        await updateMoveElement({ layout: 'triple' })
        await finishTransition()

        assertEquals(quote.textContent, 'Second quote')
        assertEquals(requests.length, 1)

        await updateMoveElement({ layout: 'single' })
        await finishTransition()

        assertEquals(container.classList.contains('hidden'), true)
        assertEquals(requests.length, 1)
    },
)

testQuotes('Changing layouts with quotes disabled does not fetch quotes', async (sync, local, requests) => {
    sync.move.layouts = {
        single: { grid: [['time']], items: structuredClone(defaultLayouts.single.items) },
        double: { grid: [['time', '.']], items: structuredClone(defaultLayouts.double.items) },
    }
    await storage.sync.set(sync)
    await quotes({ sync, local })

    await updateMoveElement({ layout: 'double' })
    await finishTransition()

    assertEquals(requests, [])
    assertEquals(container.classList.contains('hidden'), true)
})

function testQuotes(name: string, run: (sync: Sync, local: Local, requests: string[]) => Promise<void>): void {
    Deno.test({
        name,
        sanitizeOps: false,
        sanitizeResources: false,
        fn: async () => {
            const sync = structuredClone(SYNC_DEFAULT)
            const local = structuredClone(LOCAL_DEFAULT)
            const requests: string[] = []
            const originalFetch = globalThis.fetch

            sync.lang = 'en'
            sync.quotes.frequency = 'pause'
            sync.quotes.last = 1
            localStorage.clear()
            storage.type.init()
            await storage.sync.set(sync)
            storage.local.set(local)
            container.classList.add('hidden')
            quote.textContent = ''
            author.textContent = ''

            globalThis.fetch = (input) => {
                requests.push(input instanceof Request ? input.url : input.toString())
                return Promise.resolve(Response.json(fetchedQuotes))
            }

            try {
                await run(sync, local, requests)
            } finally {
                globalThis.fetch = originalFetch
            }
        },
    })
}

async function finishTransition(): Promise<void> {
    // The widget transition and its style cleanup each wait 200ms.
    await new Promise((resolve) => setTimeout(resolve, 450))
}
