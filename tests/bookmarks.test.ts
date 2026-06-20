import './init.test.ts'

import { assertEquals } from '@std/assert'

document.body.innerHTML = `
    <main id="interface"></main>
    <dialog id="contextmenu"></dialog>
    <div id="linkblocks"></div>
`

const { SYNC_DEFAULT } = await import('../src/scripts/defaults.ts')
const { initBookmarkSync, syncBookmarks } = await import('../src/scripts/features/links/bookmarks.ts')

const toolbarTitle = 'Bookmarks Toolbar'

type Bookmark = browser.bookmarks.BookmarkTreeNode
type SyncedLinks = ReturnType<typeof syncBookmarks>

function setBookmarks(bookmarks: Bookmark[]): void {
    globalThis.startupBookmarks = [
        {
            id: 'root',
            title: '',
            children: [
                {
                    id: 'toolbar',
                    title: toolbarTitle,
                    children: bookmarks,
                },
            ],
        },
    ]
    globalThis.startupTopsites = []
}

async function syncToolbar(bookmarks: Bookmark[]): Promise<SyncedLinks> {
    setBookmarks(bookmarks)
    await initBookmarkSync(structuredClone(SYNC_DEFAULT))

    return syncBookmarks(toolbarTitle)
}

function linkUrls(links: SyncedLinks): string[] {
    return links.flatMap((link) => link.folder ? [] : [link.url])
}

function linkTitles(links: SyncedLinks): string[] {
    return links.flatMap((link) => link.folder ? [] : [link.title])
}

Deno.test({
    name: 'Bookmark sync ignores Firefox separators',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const links = await syncToolbar([
            { id: 'separator-normalized', title: '', url: 'https://data/' },
            { id: 'separator-data-url', title: '', url: 'data:text/plain;charset=utf-8,' },
            { id: 'deno', title: 'Deno', url: 'https://deno.com/' },
            { id: 'untitled', title: '', url: 'https://example.com/' },
            { id: 'hostless', title: '', url: 'about:blank' },
        ])

        assertEquals(linkUrls(links), ['https://deno.com/', 'https://example.com/', '#about:blank'])
        assertEquals(linkTitles(links), ['Deno', '', ''])
    },
})

Deno.test({
    name: 'Bookmark sync keeps separators out after resync',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const bookmarks = [
            { id: 'separator-normalized', title: '', url: 'https://data/' },
            { id: 'example', title: 'Example', url: 'https://example.com/' },
        ]

        await syncToolbar(bookmarks)
        const links = await syncToolbar(bookmarks)

        assertEquals(linkUrls(links), ['https://example.com/'])
    },
})
