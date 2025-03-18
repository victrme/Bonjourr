import { SYNC_DEFAULT } from '../defaults'
import { bundleLinks } from '../utils/bundlelinks'

// https://stackoverflow.com/a/53593328
export default function orderedStringify(data: Sync.Storage) {
	const orderedKeys = [...Object.keys(SYNC_DEFAULT)]

	// Recursively get all keys
	const keylist = new Set<string>()

	// ???????????
	// JSON.stringify(data, (key, value) => (keylist.add(key), value))

	// Add links after other links data
	const links = bundleLinks(data)
	if (links.length > 0) {
		links.forEach((link) => orderedKeys.splice(orderedKeys.indexOf('linksrow') + 1, 0, link._id))
	}

	// Uses syncDefault order
	const sortOrder = (a: string, b: string) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)

	return JSON.stringify(data, Array.from(keylist).sort(sortOrder), 2)
}
