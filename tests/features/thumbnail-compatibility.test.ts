import { assertEquals } from '@std/assert'
import '../init.ts'
import { SYNC_DEFAULT, tabsBc } from '../../src/scripts/defaults.ts'
import { storage } from '../../src/scripts/storage.ts'
import { migrateLegacyThumbnailIcons } from '../../src/scripts/features/links/thumbnail-compatibility.ts'
import type { LinkElem } from '../../src/types/shared.ts'

Deno.test('Experimental thumbnail URL migration preserves standard icons and capture sources without fetching', async () => {
    const originalSet = storage.sync.set
    const originalFetch = globalThis.fetch
    const saved: string[] = []
    const link: LinkElem = { _id: 'links1', title: 'Example', url: 'https://example.com/', order: 0 }
    const standard = {
        ...link,
        _id: 'linksstandard',
        icon: { type: 'url' as const, value: 'https://example.com/icon.png' },
    }
    const capture = { ...link, _id: 'linkscapture', thumbnail: { type: 'capture' as const } }
    const legacy = { ...link, thumbnail: { type: 'url' as const, value: 'https://example.com/old-preview.png' } }
    const data = { ...SYNC_DEFAULT, links1: legacy, linksstandard: standard, linkscapture: capture }
    globalThis.fetch = () => {
        throw new Error('Migration must not fetch images')
    }
    storage.sync.set = (value) => {
        saved.push(...Object.keys(value))
        return Promise.resolve()
    }
    try {
        await migrateLegacyThumbnailIcons(data)
        assertEquals((data.links1 as LinkElem).thumbnail, undefined)
        assertEquals((data.links1 as LinkElem).icon, { type: 'url', value: legacy.thumbnail.value })
        assertEquals(data.linksstandard, standard)
        assertEquals(data.linkscapture, capture)
        assertEquals(saved, ['links1'])
    } finally {
        storage.sync.set = originalSet
        globalThis.fetch = originalFetch
        tabsBc.close()
    }
})
