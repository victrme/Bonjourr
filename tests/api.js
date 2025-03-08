export default {
	async fetch(request, _, ctx) {
		const url = new URL(request.url)
		const cacheUrl = url.href.replace(url.origin, 'https://api.bonjourr.fr')
		const cacheKey = new Request(cacheUrl)
		const cache = caches.default

		let response = await cache.match(cacheKey)

		if (!response) {
			response = await fetch(cacheUrl)
			response = new Response(response.body, response)
			response.headers.set('Cache-Control', 'public, maxage=3600, s-maxage=3600, immutable')
			ctx.waitUntil(cache.put(cacheKey, response.clone()))
		}

		return response
	},
}
