/**
 * A rewrite of the CacheStorage using indexedDB.
 *
 * This is generated code, which I do not intend to understand fully.
 * As long as it behaves the same way as CacheStorage for Safari, I am happy.
 */

export class IDBCache {
	private dbPromise: Promise<IDBDatabase>

	constructor(private name: string) {
		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(name, 1)

			request.onupgradeneeded = () => {
				request.result.createObjectStore('files')
			}
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	}

	private async withStore<T>(
		mode: IDBTransactionMode,
		fn: (store: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		const db = await this.dbPromise

		return new Promise<T>((resolve, reject) => {
			const tx = db.transaction('files', mode)
			const store = tx.objectStore('files')
			const req = fn(store)
			req.onsuccess = () => resolve(req.result)
			req.onerror = () => reject(req.error)
		})
	}

	async put(request: Request, response: Response) {
		const blob = await response.blob()
		await this.withStore('readwrite', (s) => s.put(blob, request.url))
	}

	async match(request: Request | string): Promise<Response | undefined> {
		const key = typeof request === 'string' ? request : request.url
		const blob = await this.withStore('readonly', (s) => s.get(key))
		return blob ? new Response(blob) : undefined
	}

	async delete(request: Request | string) {
		const key = typeof request === 'string' ? request : request.url
		await this.withStore('readwrite', (s) => s.delete(key))
	}

	async keys(): Promise<Request[]> {
		const db = await this.dbPromise

		return new Promise<Request[]>((resolve, reject) => {
			const tx = db.transaction('files', 'readonly')
			const store = tx.objectStore('files')
			const req = store.getAllKeys()

			req.onsuccess = () => {
				const keys = (req.result as string[]).map((url) => new Request(url))
				resolve(keys)
			}

			req.onerror = () => reject(req.error)
		})
	}
}
