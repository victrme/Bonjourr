import { assertEquals, assertRejects } from '@std/assert'
import '../init.ts'

const { storage } = await import('../../src/scripts/storage.ts')

for (const type of ['sync', 'local'] as const) {
    Deno.test(`Layout writes to ${type} storage wait for completion and propagate failures`, async () => {
        const pending = Promise.withResolvers<void>()
        let written: unknown
        const backend = {
            get: () => Promise.resolve({ syncStorage: { greeting: 'Keep this greeting' } }),
            set: (value: unknown): Promise<void> => {
                written = value
                return pending.promise
            },
        }
        Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { [type]: backend } } })
        if (type === 'local') {
            Object.defineProperty(globalThis, 'startupStorage', {
                configurable: true,
                value: { local: { syncStorage: { greeting: 'Keep this greeting' } } },
            })
        }
        try {
            storage.type.init()
            const payload = {
                freeLayout: {
                    enabled: true,
                    mode: 'grid' as const,
                    viewport: { width: 1200, height: 800 },
                    widgets: {},
                },
            }
            let saved = false
            const writing = storage.sync.set(payload).then(() => saved = true)
            await Promise.resolve()
            assertEquals(saved, false)
            pending.resolve()
            await writing
            assertEquals(saved, true)
            assertEquals(
                written,
                type === 'sync' ? payload : { syncStorage: { greeting: 'Keep this greeting', ...payload } },
            )
            backend.set = () => Promise.reject(new Error('Storage quota exceeded'))
            await assertRejects(() => storage.sync.set(payload), Error, 'Storage quota exceeded')
        } finally {
            Reflect.deleteProperty(globalThis, 'chrome')
            Reflect.deleteProperty(globalThis, 'startupStorage')
            storage.type.init()
        }
    })
}
