import { Sync } from '../types/sync'
import { syncDefaults, bundleLinks } from '../utils'

// https://stackoverflow.com/a/53593328
export default function orderedStringify(data: { [key in string]: unknown }) {
	const sync = { ...syncDefaults }
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
