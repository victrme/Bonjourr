import { assertEquals, assertRejects } from '@std/assert'
import './init.ts'

import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../src/scripts/defaults.ts'
import { storage } from '../src/scripts/storage.ts'

type StoredData = Record<string, unknown>

interface MockStorageArea {
    area: chrome.storage.StorageArea
    data: StoredData
    rejectNextGet: (message: string) => void
    rejectNextSet: (message: string) => void
}

Deno.test({
    name: 'Queued sync updates preserve the latest background state',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const sync = createStorageArea(SYNC_DEFAULT as unknown as StoredData)
        const local = createStorageArea(LOCAL_DEFAULT as unknown as StoredData)
        useChromeStorage(sync.area, local.area)
        globalThis.startupStorage = {
            sync: structuredClone(SYNC_DEFAULT),
            local: structuredClone(LOCAL_DEFAULT),
        }
        storage.type.init()

        const firstUpdateStarted = deferred<void>()
        const releaseFirstUpdate = deferred<void>()
        const olderUpdate = storage.sync.update('backgrounds', async (backgrounds) => {
            firstUpdateStarted.resolve()
            await releaseFirstUpdate.promise
            backgrounds.bright = 0.4
        })

        await firstUpdateStarted.promise

        const queryUpdate = storage.sync.update('backgrounds', (backgrounds) => {
            backgrounds.queries['unsplash-images-search'] = 'snowy mountains'
        })

        releaseFirstUpdate.resolve()
        await Promise.all([olderUpdate, queryUpdate])

        const reloaded = await storage.sync.get('backgrounds')
        assertEquals(reloaded.backgrounds.bright, 0.4)
        assertEquals(reloaded.backgrounds.queries['unsplash-images-search'], 'snowy mountains')
    },
})

Deno.test({
    name: 'Queued sync updates use disabled-sync storage',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const sync = createStorageArea()
        const local = createStorageArea({
            ...structuredClone(LOCAL_DEFAULT),
            syncStorage: structuredClone(SYNC_DEFAULT),
        })
        useChromeStorage(sync.area, local.area)
        globalThis.startupStorage = {
            local: local.data as unknown as typeof LOCAL_DEFAULT,
        }
        storage.type.init()

        await Promise.all([
            storage.sync.update('backgrounds', (backgrounds) => {
                backgrounds.mute = false
            }),
            storage.sync.update('backgrounds', (backgrounds) => {
                backgrounds.queries['unsplash-images-search'] = 'desert'
            }),
        ])

        const reloaded = await storage.sync.get('backgrounds')
        assertEquals(reloaded.backgrounds.mute, false)
        assertEquals(reloaded.backgrounds.queries['unsplash-images-search'], 'desert')
    },
})

Deno.test({
    name: 'Rejected queued sync updates do not block later updates',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const sync = createStorageArea(SYNC_DEFAULT as unknown as StoredData)
        const local = createStorageArea(LOCAL_DEFAULT as unknown as StoredData)
        useChromeStorage(sync.area, local.area)
        globalThis.startupStorage = {
            sync: structuredClone(SYNC_DEFAULT),
            local: structuredClone(LOCAL_DEFAULT),
        }
        storage.type.init()

        sync.rejectNextGet('read failed')
        await assertRejects(
            () => storage.sync.update('backgrounds', (backgrounds) => {
                backgrounds.blur = 1
            }),
            Error,
            'read failed',
        )

        sync.rejectNextSet('write failed')
        await assertRejects(
            () => storage.sync.update('backgrounds', (backgrounds) => {
                backgrounds.blur = 2
            }),
            Error,
            'write failed',
        )

        await storage.sync.update('backgrounds', (backgrounds) => {
            backgrounds.blur = 3
        })

        const reloaded = await storage.sync.get('backgrounds')
        assertEquals(reloaded.backgrounds.blur, 3)
    },
})

function createStorageArea(initial: StoredData = {}): MockStorageArea {
    const data = structuredClone(initial)
    let getError: Error | undefined
    let setError: Error | undefined

    const area = {
        async get(keys?: string | string[] | null): Promise<StoredData> {
            if (getError) {
                const error = getError
                getError = undefined
                throw error
            }

            if (typeof keys === 'string') {
                return keys in data ? { [keys]: structuredClone(data[keys]) } : {}
            }
            if (Array.isArray(keys)) {
                return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, structuredClone(data[key])]))
            }

            return structuredClone(data)
        },
        async set(items: StoredData): Promise<void> {
            if (setError) {
                const error = setError
                setError = undefined
                throw error
            }

            Object.assign(data, structuredClone(items))
        },
    } as unknown as chrome.storage.StorageArea

    return {
        area,
        data,
        rejectNextGet(message: string): void {
            getError = new Error(message)
        },
        rejectNextSet(message: string): void {
            setError = new Error(message)
        },
    }
}

function useChromeStorage(sync: chrome.storage.StorageArea, local: chrome.storage.StorageArea): void {
    Reflect.set(globalThis, 'chrome', { storage: { sync, local } })
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void } {
    let resolve = (_value: T | PromiseLike<T>): void => {}
    const promise = new Promise<T>((promiseResolve) => resolve = promiseResolve)
    return { promise, resolve }
}
