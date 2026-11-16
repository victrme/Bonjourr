import type { Advanced } from '../../types/sync.ts'

type AltModeEvent = Pick<KeyboardEvent, 'altKey' | 'shiftKey'> | Pick<MouseEvent, 'altKey' | 'shiftKey'>

export function isAltModeShortcut(
    advanced: Pick<Advanced, 'altMode' | 'altModeShortcut'>,
    event: AltModeEvent,
    exact = false,
): boolean {
    if (!advanced.altMode || !event.altKey) {
        return false
    }

    if ((advanced.altModeShortcut ?? 'alt') === 'alt-shift') {
        return event.shiftKey
    }

    return !exact || !event.shiftKey
}
