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

export const eventDebounce = debounce((value: Record<string, unknown>) => {
    storage.sync.set(value)
}, 400)
