import { IDBCache } from '../../dependencies/idbcache.ts'
import { getCache } from '../../shared/cache.ts'

export async function storeIconFile(id: string, file: File): Promise<Blob | undefined> {
	const cache = await getCache('local-icons')
	const request = new Request(`http://127.0.0.1:8888/${id}/`)
	const headers = { 'content-type': file.type, 'Cache-Control': 'max-age=604800' }
	const response = new Response(file, { headers: headers })

	cache.put(request, response)

	return file
}

export async function getIconFile(id: string): Promise<Blob | undefined> {
	const cache = await getCache('local-icons')
	const icon = await (await cache.match(`http://127.0.0.1:8888/${id}/`))?.blob()

	if (!icon) {
		return
	}

	return icon
}

export async function removeIconFile(id: string): Promise<void> {
	const cache = await getCache('local-icons')
	await cache.delete(`http://127.0.0.1:8888/${id}/`)
}

export function getAllIconsSync(callback: (requests: readonly Request[]) => void): void {
	getCache('local-icons').then((cache) => {
		cache.match('http://127.0.0.1:8888/linksfolhcf/').then((icon) => {
			icon?.blob().then((blob) => {
				document.querySelector('img')!.src = URL.createObjectURL(blob)
			})
		})
	})
}

export function getIconCacheSync(callback: (cache: Cache | IDBCache) => void) {
	getCache('local-icons').then((cache) => {
		callback(cache)
	})
}
