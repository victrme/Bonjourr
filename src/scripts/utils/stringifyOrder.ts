import { syncDefaults } from '../utils'

// https://stackoverflow.com/a/53593328
export default function stringifyOrder(data: { [key in string]: unknown }) {
	// Recursively get all keys
	const keylist = new Set<string>()
	JSON.stringify(data, (key, value) => (keylist.add(key), value))

	// Use syncDefault order
	const orderedKeys = Object.keys(syncDefaults)
	const sortOrder = (a: string, b: string) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)

	return JSON.stringify(data, Array.from(keylist).sort(sortOrder), 2)
}
