import { GlobalRegistrator } from '@happy-dom/global-registrator'
import 'fake-indexeddb/auto'

GlobalRegistrator.register({
    url: 'http://localhost:3000',
    width: 1,
    height: 1,
})

/*
 * Happy-dom <> Deno event mismatch fix
 */
const dispatchEvent = globalThis.dispatchEvent.bind(globalThis)

globalThis.dispatchEvent = (event: Event): boolean => {
    if (event instanceof Event) {
        return dispatchEvent(event)
    }

    return true
}
