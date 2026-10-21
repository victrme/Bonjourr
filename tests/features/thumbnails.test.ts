import { assertEquals, assertRejects, assertThrows } from '@std/assert'
import 'fake-indexeddb/auto'
import {
    readThumbnail,
    removeThumbnail,
    thumbnailSourceKey,
    thumbnailWebsiteUrl,
    writeThumbnail,
} from '../../src/scripts/shared/thumbnails.ts'

const source = { type: 'capture' as const }
const url = 'https://example.com/'

Deno.test('Thumbnail URLs reject browser pages, scripts and embedded credentials', () => {
    for (
        const value of [
            'about:blank',
            'chrome://settings',
            'file:///tmp/page',
            'javascript:alert(1)',
            'https://user:secret@example.com/',
        ]
    ) {
        assertThrows(() => thumbnailWebsiteUrl(value))
    }
    assertEquals(thumbnailWebsiteUrl('https://example.com'), url)
    assertEquals(thumbnailWebsiteUrl('http://localhost:8000/'), 'http://localhost:8000/')
})

Deno.test('Cached thumbnails are bound to link ID, website URL and image source', async () => {
    await removeThumbnail()
    await writeThumbnail({
        id: 'links1',
        url,
        source: thumbnailSourceKey(source),
        image: new Blob(['image'], { type: 'image/jpeg' }),
        updated: 1,
    })
    assertEquals(await (await readThumbnail('links1', url, source))?.text(), 'image')
    assertEquals(await readThumbnail('links1', 'https://different.example/', source), undefined)
    assertEquals(await readThumbnail('links1', url, { type: 'url', value: 'https://example.com/image.jpg' }), undefined)
    assertEquals(await readThumbnail('links2', url, source), undefined)
    await removeThumbnail('links1')
    assertEquals(await readThumbnail('links1', url, source), undefined)
})

Deno.test('Invalid replacements preserve an existing thumbnail', async () => {
    await removeThumbnail()
    const record = {
        id: 'links1',
        url,
        source: thumbnailSourceKey(source),
        image: new Blob(['old'], { type: 'image/jpeg' }),
        updated: 1,
    }
    await writeThumbnail(record)
    await assertRejects(() => writeThumbnail({ ...record, image: new Blob(['not an image'], { type: 'text/plain' }) }))
    await assertRejects(() =>
        writeThumbnail({ ...record, image: new Blob([new Uint8Array(256 * 1024 + 1)], { type: 'image/png' }) })
    )
    assertEquals(await (await readThumbnail('links1', url, source))?.text(), 'old')
})

Deno.test('Thumbnail cache evicts the oldest images at the count and byte limits', async () => {
    await removeThumbnail()
    for (let i = 0; i < 101; i++) {
        await writeThumbnail({
            id: `links${i}`,
            url,
            source: thumbnailSourceKey(source),
            image: new Blob(['image'], { type: 'image/jpeg' }),
            updated: i,
        })
    }
    assertEquals(await readThumbnail('links0', url, source), undefined)
    assertEquals(!!await readThumbnail('links100', url, source), true)
    await removeThumbnail()
    for (let i = 0; i < 33; i++) {
        await writeThumbnail({
            id: `links${i}`,
            url,
            source: thumbnailSourceKey(source),
            image: new Blob([new Uint8Array(256 * 1024)], { type: 'image/jpeg' }),
            updated: i,
        })
    }
    assertEquals(await readThumbnail('links0', url, source), undefined)
    assertEquals(!!await readThumbnail('links32', url, source), true)
    await removeThumbnail()
    assertEquals(await readThumbnail('links32', url, source), undefined)
})
