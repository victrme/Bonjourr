import { assertEquals } from '@std/assert'
import '../init.ts'

import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../../src/scripts/defaults.ts'
import { loadCallbacks } from '../../src/scripts/utils/onsettingsload.ts'

type StoredData = Record<string, unknown>

document.body.innerHTML = `
    <main id="interface"></main>
    <dialog id="contextmenu"></dialog>
    <div id="background-wrapper">
        <div id="background-media"><div></div></div>
        <div id="background-texture"></div>
    </div>
    <form id="f_background-user-coll"><input /><button></button><small></small></form>
    <form id="f_background-user-search"><input /><button></button><small></small></form>
`

const syncData = structuredClone(SYNC_DEFAULT) as unknown as StoredData
const localData = structuredClone(LOCAL_DEFAULT) as unknown as StoredData
const firstReadStarted = deferred<void>()
const releaseFirstRead = deferred<void>()
let syncGetCount = 0

const syncArea = {
    async get(keys?: string | string[] | null): Promise<StoredData> {
        syncGetCount += 1
        if (syncGetCount === 1) {
            firstReadStarted.resolve()
            await releaseFirstRead.promise
        }

        if (typeof keys === 'string') {
            return { [keys]: structuredClone(syncData[keys]) }
        }

        return structuredClone(syncData)
    },
    async set(items: StoredData): Promise<void> {
        Object.assign(syncData, structuredClone(items))
    },
} as unknown as chrome.storage.StorageArea

const localArea = {
    async get(keys?: string | string[] | null): Promise<StoredData> {
        if (typeof keys === 'string') {
            return { [keys]: structuredClone(localData[keys]) }
        }

        return structuredClone(localData)
    },
    async set(items: StoredData): Promise<void> {
        Object.assign(localData, structuredClone(items))
    },
} as unknown as chrome.storage.StorageArea

Reflect.set(globalThis, 'chrome', { storage: { sync: syncArea, local: localArea } })
globalThis.startupStorage = {
    sync: structuredClone(SYNC_DEFAULT),
    local: structuredClone(LOCAL_DEFAULT),
}

const { storage } = await import('../../src/scripts/storage.ts')
const { backgroundUpdate, filtersUpdate } = await import('../../src/scripts/features/backgrounds/index.ts')
storage.type.init()
loadCallbacks()

Deno.test({
    name: 'A delayed background update preserves a newly emptied Unsplash query',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        const backgrounds = syncData.backgrounds as typeof SYNC_DEFAULT.backgrounds
        const local = localData as unknown as typeof LOCAL_DEFAULT
        backgrounds.images = 'unsplash-images-search'
        backgrounds.queries['unsplash-images-search'] = 'old query'
        local.backgroundCollections['unsplash-images-search'] = [{
            format: 'image',
            page: '',
            username: '',
            urls: { full: 'https://example.com/image.jpg', small: 'https://example.com/image.jpg' },
        }]

        const olderUpdate = filtersUpdate({ bright: 0.35 })
        await firstReadStarted.promise

        const form = document.getElementById('f_background-user-search') as HTMLFormElement
        const input = form.querySelector('input') as HTMLInputElement
        input.value = ''
        const submit = new SubmitEvent('submit')
        Object.defineProperty(submit, 'target', { value: form })

        const queryUpdate = backgroundUpdate({ query: submit })
        await Promise.resolve()
        releaseFirstRead.resolve()
        await Promise.all([olderUpdate, queryUpdate])

        const reloaded = await storage.sync.get('backgrounds')
        const reloadedLocal = await storage.local.get('backgroundCollections')
        assertEquals(reloaded.backgrounds.bright, 0.35)
        assertEquals(reloaded.backgrounds.queries['unsplash-images-search'], '')
        assertEquals(reloadedLocal.backgroundCollections['unsplash-images-search'], [])
    },
})

function deferred<T>(): { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void } {
    let resolve = (_value: T | PromiseLike<T>): void => {}
    const promise = new Promise<T>((promiseResolve) => resolve = promiseResolve)
    return { promise, resolve }
}
