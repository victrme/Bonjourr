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
