import type { Frequency } from '../../types/shared'

export function isEvery(freq = ''): freq is Frequency {
	const every: Frequency[] = ['tabs', 'hour', 'day', 'period', 'pause']
	return every.includes(freq as Frequency)
}
