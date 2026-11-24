import type { Advanced } from '../../types/sync.ts'

type AltModeEvent = Pick<KeyboardEvent, 'altKey' | 'shiftKey'> | Pick<MouseEvent, 'altKey' | 'shiftKey'>

export function isAltModeKeybind(
    advanced: Pick<Advanced, 'altMode' | 'altModeKeybind'>,
    event: AltModeEvent,
    exact = false,
): boolean {
    if (!advanced.altMode || !event.altKey) {
        return false
    }

    if ((advanced.altModeKeybind ?? 'alt') === 'alt-shift') {
        return event.shiftKey
    }

    return !exact || !event.shiftKey
}
