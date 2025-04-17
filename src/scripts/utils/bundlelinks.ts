import type { Link } from '../../types/shared'
import type { Sync } from '../../types/sync'

export function bundleLinks(data: Sync): Link[] {
	// 1.13.0: Returns an array of found links in storage
	const res: Link[] = []

	Object.entries(data).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) {
			res.push(val as Link)
		}
	})

	return res
}
