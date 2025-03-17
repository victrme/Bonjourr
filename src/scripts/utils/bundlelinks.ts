export function bundleLinks(data: Sync.Storage): Links.Link[] {
	// 1.13.0: Returns an array of found links in storage
	const res: Links.Link[] = []

	Object.entries(data).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) res.push(val as Links.Link)
	})

	return res
}
