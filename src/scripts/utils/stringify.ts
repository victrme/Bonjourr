import { SYNC_DEFAULT } from '../defaults.ts'
import { bundleLinks } from './bundlelinks.ts'

import type { Sync } from '../../types/sync.ts'

export function stringify(data: Sync) {
	const defaultSyncData = structuredClone(SYNC_DEFAULT)

	// 1a. Add links to defaults
	for (const link of bundleLinks(data)) {
		defaultSyncData[link._id] = link
	}

	// 1b. Add missing fields inside default objects
	for (const key of Object.keys(data)) {
		const curr = data[key]
		const def = defaultSyncData[key]
		const bothObjects = isObject(curr) && isObject(def)

		if (bothObjects) {
			defaultSyncData[key] = { ...def, ...curr }
		}
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

		if (isObject(value)) {
			result.push(...flattenKeys(value))
		}
	}

	return result
}

function isObject(value: unknown): value is object {
	return !Array.isArray(value) && typeof value === 'object'
}
