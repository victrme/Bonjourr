import '../init.test.ts'
import { assertEquals } from '@std/assert'

import { initBookmarkSync, syncBookmarks } from '../../src/scripts/features/links/bookmarks.ts'
import { SYNC_DEFAULT } from '../../src/scripts/defaults.ts'
import type { Treenode } from '../../src/scripts/features/links/bookmarks.ts'

type SyncedLinks = ReturnType<typeof syncBookmarks>

document.body.innerHTML = `
    <main id="interface"></main>
    <dialog id="contextmenu"></dialog>
    <div id="linkblocks"></div>
`

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

/*
 * Functions
 */

function setBookmarks(bookmarks: Treenode[]): void {
    globalThis.startupBookmarks = [{
        id: 'root',
        title: '',
        children: [{
            id: 'toolbar',
            title: 'Bookmarks Toolbar',
            children: bookmarks,
        }],
    }]
    globalThis.startupTopsites = []
}

async function syncToolbar(bookmarks: Treenode[]): Promise<SyncedLinks> {
    setBookmarks(bookmarks)
    await initBookmarkSync(structuredClone(SYNC_DEFAULT))
    return syncBookmarks('Bookmarks Toolbar')
}

function linkUrls(links: SyncedLinks): string[] {
    return links.flatMap((link) => link.folder ? [] : [link.url])
}

function linkTitles(links: SyncedLinks): string[] {
    return links.flatMap((link) => link.folder ? [] : [link.title])
}
