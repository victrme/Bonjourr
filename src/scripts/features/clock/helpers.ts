import type { AnalogStyle, Sync } from '../../../types/sync.ts'

type DateFormat = Sync['dateformat']

let numberWidths = [1]

export function setSecondsWidthInCh() {
	const span = document.querySelector<HTMLElement>('.digital-number-width')

	if (!span) {
		return
	}

	const zero = span.offsetWidth
	numberWidths = [1]

	for (let i = 1; i < 6; i++) {
		span.textContent = i.toString()
		numberWidths.push(Math.round((span.offsetWidth / zero) * 10) / 10)
	}
}

export function getSecondsWidthInCh(second: number): number {
	return Math.min(...numberWidths) + numberWidths[second]
}

export function fixunits(val: number) {
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
