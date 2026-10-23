import { assertEquals } from '@std/assert'
import '../init.ts'
import { storage } from '../../src/scripts/storage.ts'
import { LOCAL_DEFAULT, SYNC_DEFAULT, tabsBc } from '../../src/scripts/defaults.ts'

Deno.test('Thumbnail cache errors do not block Bonjourr reset', async (test) => {
    const originalChrome = globalThis.chrome
    const originalCacheDelete = caches.delete
    const originalOpen = indexedDB.open
    const originalWarn = console.warn
    let syncCleared = false
    let localCleared = false
    let syncDefaults: unknown
    let localDefaults: unknown
    globalThis.chrome = {
        storage: {
            sync: {
                clear: () => {
                    syncCleared = true
                    return Promise.resolve()
                },
                set: (value: unknown) => {
                    syncDefaults = value
                    return Promise.resolve()
                },
            },
            local: {
                clear: () => {
                    localCleared = true
                    return Promise.resolve()
                },
                set: (value: unknown) => {
                    localDefaults = value
                    return Promise.resolve()
                },
            },
        },
    } as unknown as typeof chrome
    caches.delete = () => Promise.resolve(true)
    console.warn = () => {}
    try {
        for (const unavailable of [false, true]) {
            await test.step(
                unavailable ? 'Thumbnail database unavailable' : 'Thumbnail database available',
                async () => {
                    indexedDB.open = unavailable
                        ? () => {
                            throw new DOMException('Thumbnail database unavailable', 'UnknownError')
                        }
                        : originalOpen
                    sessionStorage.setItem('reset-probe', 'value')
                    localStorage.setItem('reset-probe', 'value')
                    localStorage.setItem('bonjourr-archive-probe', 'archive')
                    syncCleared = false
                    localCleared = false
                    syncDefaults = undefined
                    localDefaults = undefined

                    await storage.clearall()

                    assertEquals(sessionStorage.getItem('reset-probe'), null)
                    assertEquals(localStorage.getItem('reset-probe'), null)
                    assertEquals(localStorage.getItem('bonjourr-archive-probe'), 'archive')
                    assertEquals(syncCleared, true)
                    assertEquals(localCleared, true)
                    assertEquals(syncDefaults, SYNC_DEFAULT)
                    assertEquals(localDefaults, LOCAL_DEFAULT)
                },
            )
        }
    } finally {
        globalThis.chrome = originalChrome
        caches.delete = originalCacheDelete
        indexedDB.open = originalOpen
        console.warn = originalWarn
        sessionStorage.clear()
        localStorage.clear()
        tabsBc.close()
    }
})
