export interface ThumbnailSource {
    // File/URL values are read only to migrate data from earlier local test builds.
    type: 'capture' | 'file' | 'url'
    value?: string
}

export interface ThumbnailRecord {
    id: string
    url: string
    source: string
    image: Blob
    updated: number
}

const DATABASE = 'bonjourr-thumbnails'
const STORE = 'images'
const MAX_IMAGES = 100
const MAX_BYTES = 8 * 1024 * 1024

export function thumbnailSourceKey(source: ThumbnailSource): string {
    return `${source.type}:${source.value ?? ''}`
}

export function thumbnailWebsiteUrl(value: string): string {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Only HTTP and HTTPS websites without URL credentials can be captured')
    }
    return url.href
}

async function openDatabase(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1)
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
        request.onsuccess = () => {
            request.result.onversionchange = () => request.result.close()
            resolve(request.result)
        }
        request.onerror = () => reject(request.error)
        request.onblocked = () => reject(new Error('Thumbnail storage is busy'))
    })
}

export async function readThumbnail(id: string, url: string, source: ThumbnailSource): Promise<Blob | undefined> {
    const db = await openDatabase()
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction(STORE).objectStore(STORE).get(id)
            request.onsuccess = () => {
                const record = request.result as ThumbnailRecord | undefined
                resolve(record?.url === url && record.source === thumbnailSourceKey(source) ? record.image : undefined)
            }
            request.onerror = () => reject(request.error)
        })
    } finally {
        db.close()
    }
}

export async function writeThumbnail(record: ThumbnailRecord): Promise<void> {
    if (!record.image.type.startsWith('image/') || record.image.size > 256 * 1024) {
        throw new Error('Thumbnail image is too large or invalid')
    }
    const db = await openDatabase()
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE, 'readwrite')
            const store = transaction.objectStore(STORE)
            store.put(record)
            const request = store.getAll()
            request.onsuccess = () => {
                const records = (request.result as ThumbnailRecord[]).sort((a, b) => b.updated - a.updated)
                let bytes = 0
                for (const [index, item] of records.entries()) {
                    bytes += item.image.size
                    if (index >= MAX_IMAGES || bytes > MAX_BYTES) store.delete(item.id)
                }
            }
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(transaction.error)
            transaction.onabort = () => reject(transaction.error ?? new Error('Thumbnail storage was interrupted'))
        })
    } finally {
        db.close()
    }
}

export async function removeThumbnail(id?: string): Promise<void> {
    const db = await openDatabase()
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE, 'readwrite')
            const store = transaction.objectStore(STORE)
            if (id) store.delete(id)
            else store.clear()
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(transaction.error)
            transaction.onabort = () => reject(transaction.error ?? new Error('Thumbnail storage was interrupted'))
        })
    } finally {
        db.close()
    }
}

export async function resizeThumbnail(image: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(image)
    try {
        const canvas = new OffscreenCanvas(512, 320)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Cannot resize thumbnail')
        const scale = Math.max(512 / bitmap.width, 320 / bitmap.height)
        context.fillStyle = '#fff'
        context.fillRect(0, 0, 512, 320)
        context.drawImage(bitmap, (512 - bitmap.width * scale) / 2, 0, bitmap.width * scale, bitmap.height * scale)
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    } finally {
        bitmap.close()
    }
}
