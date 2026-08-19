import { storage } from '../storage.ts'

type AnyFunction = (...args: never[]) => unknown

type Debounced<F extends AnyFunction> = {
    (...args: Parameters<F>): void
    cancel: () => void
}

export function debounce<F extends AnyFunction>(callback: F, waitFor: number): Debounced<F> {
    let timeout: ReturnType<typeof setTimeout>

    const debounced = (...args: Parameters<F>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => callback(...args), waitFor)
    }

    debounced.cancel = () => clearTimeout(timeout)

    return debounced
}

// <!> `eventDebounce` is called from ~15 unrelated call sites across the
// <!> app (notes, searchbar, css, clock, fonts, links, tab title, page
// <!> width/gap, text shadow, favicon...). It used to be a single shared
// <!> `debounce()` instance with one timeout: any two calls within 400ms
// <!> canceled each other and only the *last* call's value ever reached
// <!> storage. E.g. dragging the page-width slider then typing a tab title
// <!> within 400ms silently dropped the page-width write. Debouncing is
// <!> now keyed per top-level settings key (every call site here passes a
// <!> single-key object), so unrelated settings no longer race each other
// <!> -- rapid writes to the *same* key still coalesce into one, same as
// <!> before.
const eventDebounceTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function eventDebounce(value: Record<string, unknown>): void {
    for (const key of Object.keys(value)) {
        clearTimeout(eventDebounceTimeouts.get(key))

        eventDebounceTimeouts.set(
            key,
            setTimeout(() => {
                eventDebounceTimeouts.delete(key)
                storage.sync.set({ [key]: value[key] })
            }, 400),
        )
    }
}
