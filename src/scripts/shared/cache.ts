import { PLATFORM } from '../defaults.ts'
import { IDBCache } from '../dependencies/idbcache.ts'

export function getCache(name: string): Promise<Cache | IDBCache> {
	if (PLATFORM === 'safari') {
		// CacheStorage doesn't work on Safari extensions, need indexedDB
		return Promise.resolve(new IDBCache(name))
	}

	return caches.open(name)
}
