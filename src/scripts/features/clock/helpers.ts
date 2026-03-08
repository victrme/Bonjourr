import type { AnalogStyle, Sync } from '../../../types/sync.ts'

type DateFormat = Sync['dateformat']

export function fixunits(val: number): string {
    return (val < 10 ? '0' : '') + val.toString()
}

export function isFace(str?: string): str is AnalogStyle['face'] {
    return ['none', 'number', 'roman', 'marks', 'swiss', 'braun'].includes(str ?? '')
}

export function isHands(str?: string): str is AnalogStyle['hands'] {
    return ['modern', 'swiss', 'classic', 'braun', 'apple'].includes(str ?? '')
}

export function isShape(str?: string): str is AnalogStyle['shape'] {
    return ['round', 'square', 'rectangle'].includes(str ?? '')
}

export function isDateFormat(str = ''): str is DateFormat {
    return ['auto', 'eu', 'us', 'cn'].includes(str)
}

export function isAmpmPosition(str?: string): str is 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
    return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(str ?? '')
}
