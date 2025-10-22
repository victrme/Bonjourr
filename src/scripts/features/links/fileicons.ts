import { compressAsDataUri, svgToText } from '../../shared/compress.ts'
import type { IDBCache } from '../../dependencies/idbcache.ts'
import { getCache } from '../../shared/cache.ts'

async function convertIconFileToDataUri(file: File): Promise<string> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Icon file must be an image')
	}

	const isSmall = file.size < 16000
	const type = file.type.replace('image/', '')

	if (isSmall) {
		if (type.includes('svg')) {
			const data = await svgToText(file)
			return `data:image/svg+xml;base64,${btoa(data)}`
		}
		if (type.includes('png')) {
			return await compressAsDataUri(file, {
				square: true,
				type: 'png',
				q: 1.0,
			})
		}
	}

	return await compressAsDataUri(file, {
		type: type.includes('png') ? 'png' : 'jpeg',
		square: true,
		size: 144,
		q: .8,
	})
}

export async function storeIconFile(id: string, file: File): Promise<string> {
	const uri = await convertIconFileToDataUri(file)
	const cache = await getCache('local-icons')
	const request = new Request(`http://127.0.0.1:8888/${id}/`)
	const headers = { 'content-type': 'text/plain', 'Cache-Control': 'max-age=604800' }
	const response = new Response(uri, { headers: headers })

	cache.put(request, response)

	return uri
}

export async function getIconFile(id: string): Promise<string | undefined> {
	const cache = await getCache('local-icons')
	const uri = await (await cache.match(`http://127.0.0.1:8888/${id}/`))?.text()

	if (!uri) {
		return
	}

	return uri
}

export async function removeIconFile(id: string): Promise<void> {
	const cache = await getCache('local-icons')
	await cache.delete(`http://127.0.0.1:8888/${id}/`)
}

export function getIconCacheSync(callback: (cache: Cache | IDBCache) => void) {
	getCache('local-icons').then((cache) => {
		callback(cache)
	})
}
