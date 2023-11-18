import { SYNC_DEFAULT } from '../defaults'
import { bundleLinks } from '../utils'
import type { Sync } from '../types/sync'

// https://stackoverflow.com/a/53593328
export default function orderedStringify(data: { [key in string]: unknown }) {
	const sync = { ...SYNC_DEFAULT }
	const orderedKeys = Object.keys(sync)

	// Recursively get all keys
	const keylist = new Set<string>()
	JSON.stringify(data, (key, value) => (keylist.add(key), value))

	// Add links after other links data
	const links = bundleLinks(data as Sync)
	if (links.length > 0) {
		links.forEach((link) => orderedKeys.splice(orderedKeys.indexOf('linksrow') + 1, 0, link._id))
	}

	// Uses syncDefault order
	const sortOrder = (a: string, b: string) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)

	return JSON.stringify(data, Array.from(keylist).sort(sortOrder), 2)
}
