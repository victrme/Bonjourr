try {
	const port = parseInt(Deno.args[0])
	httpServer(port)
} catch (_) {
	// ...
}

export function httpServer(port = 8000, baseUrl = 'release/online') {
	const contentTypeList: Record<string, string> = {
		'.webmanifest': 'application/manifest+json',
		'.js': 'text/javascript',
		'.svg': 'image/svg+xml',
		'.ico': 'image/x-icon',
		'.mp3': 'audio/mpeg',
		'.html': 'text/html',
		'.png': 'image/png',
		'.css': 'text/css',
	}

	// Request handler
	// actual meat of the server

	const serverHandler: Deno.ServeHandler<Deno.NetAddr> = async (request) => {
		// Find resource

		const url = new URL(request.url)
		const filePath = baseUrl + (url.pathname === '/' ? '/index.html' : url.pathname)
		const fileExists = await Deno.stat(filePath)

		if (!fileExists) {
			return new Response('Not Found', {
				status: 404,
			})
		}

		// Find content type

		const headers: HeadersInit = { 'cache-control': 'no-cache' }
		const fileExt = filePath.split('.').at(-1) ?? ''
		const contentType = contentTypeList[fileExt]

		if (contentType) {
			headers.contentType = contentType
		}

		// Read data

		const data = await Deno.readFile(filePath)

		return new Response(data, {
			headers: headers,
			status: 200,
		})
	}

	// Starts server
	// catches errors

	Deno.serve({ port }, async (request, info) => {
		try {
			return await serverHandler(request, info)
		} catch (err) {
			if (err instanceof Deno.errors.NotFound) {
				return new Response('Not Found', { status: 404 })
			} else {
				return new Response('Internal Server Error', { status: 500 })
			}
		}
	})
}
