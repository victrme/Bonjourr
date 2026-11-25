import { assertEquals } from '@std/assert'
import '../init.ts'

import { initBookmarkSync, syncBookmarks } from '../../src/scripts/features/links/bookmarks.ts'
import { getDefaultIcon, isLocalUrl } from '../../src/scripts/features/links/helpers.ts'
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

Deno.test({
    name: 'Local URLs bypass remote favicon service',
    fn: () => {
        assertEquals(isLocalUrl('http://localhost:3000/'), true)
        assertEquals(isLocalUrl('http://127.0.0.1:8080/'), true)
        assertEquals(isLocalUrl('http://192.168.1.50:8123/'), true)
        assertEquals(isLocalUrl('http://10.0.0.5/'), true)
        assertEquals(isLocalUrl('http://172.20.0.2:9000/'), true)
        assertEquals(isLocalUrl('http://100.85.10.20:3000/'), true)
        assertEquals(isLocalUrl('https://nas.home.lan/'), true)
        assertEquals(isLocalUrl('http://pi.local/admin'), true)
        assertEquals(isLocalUrl('http://truenas:8080/'), true)
        assertEquals(isLocalUrl('https://github.com/victrme/Bonjourr'), false)
        assertEquals(isLocalUrl('https://172.32.0.1/'), false)

        assertEquals(getDefaultIcon('https://nas.home.lan/'), 'https://nas.home.lan/apple-touch-icon.png')
        assertEquals(getDefaultIcon('http://localhost:3000/', 123), 'http://localhost:3000/apple-touch-icon.png?r=123')
        assertEquals(
            getDefaultIcon('https://github.com/'),
            'https://services.bonjourr.fr/favicon/blob/https://github.com/',
        )
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
