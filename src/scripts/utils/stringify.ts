import { SYNC_DEFAULT } from '../defaults'
import { bundleLinks } from './bundlelinks'

export function stringify(data: Sync.Storage) {
	const defaultSyncData = structuredClone(SYNC_DEFAULT)

	// 1. Add links to defaults
	for (const link of bundleLinks(data)) {
		defaultSyncData[link._id] = link
	}

	// 2. Recursively get all keys in storage
	const keys = flattenKeys(defaultSyncData)

	// 3. Stringify, ordered by the "keys" array
	const compare = (a = '', b = '') => keys.indexOf(a) - keys.indexOf(b)
	const string = JSON.stringify(data, keys.sort(compare), 2)

	return string
}

function flattenKeys(obj: object): string[] {
	const result: string[] = []

	for (const [key, value] of Object.entries(obj)) {
		result.push(key)

		if (!Array.isArray(value) && typeof value === 'object') {
			result.push(...flattenKeys(value))
		}
	}

	return result
}
