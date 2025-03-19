import { SYNC_DEFAULT } from '../defaults'
import { bundleLinks } from './bundlelinks'

// https://stackoverflow.com/a/53593328
export function stringify(data: Sync.Storage) {
	const linkids = bundleLinks(data).map(link => link._id)
	const keys = flattenKeys(SYNC_DEFAULT).concat(linkids)
	const compare = (a = '', b = '') => keys.indexOf(a) - keys.indexOf(b)

	return JSON.stringify(data, keys.sort(compare), 2)
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
