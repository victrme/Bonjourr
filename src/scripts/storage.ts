import { LOCAL_DEFAULT, PLATFORM, SYNC_DEFAULT } from './defaults.ts'
import { deepEqual } from './dependencies/deepequal.ts'
import { parse } from './utils/parse.ts'
import * as idb from 'idb-keyval'

import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

type StorageType = 'localstorage' | 'webext-sync' | 'webext-local'

interface AllStorage {
	sync?: Sync
	local?: Local
}

interface Storage {
	sync: {
		get: (key?: string | string[]) => Promise<Sync>
		set: (val: Partial<Sync>) => Promise<void>
		remove: (key: string) => void
		clear: () => Promise<void>
	}
	local: {
		get: (key?: keyof Local | (keyof Local)[]) => Promise<Local>
		set: (val: Partial<Local>) => void
		remove: (key: keyof Local) => void
		clear: () => void
	}
	type: {
		get: () => StorageType
		change: (type: 'sync' | 'local', data: Sync) => void
		init: () => StorageType
	}
	init: () => Promise<AllStorage>
	clearall: () => Promise<void>
}

export const storage: Storage = {
	sync: {
		get: syncGet,
		set: syncSet,
		remove: syncRemove,
		clear: syncClear,
	},
	local: {
		get: localGet,
		set: localSet,
		remove: localRemove,
		clear: localClear,
	},
	init: init,
	clearall: clearall,
	type: storageTypeFn(),
}

//	Storage type

function storageTypeFn() {
	let type: StorageType = 'webext-sync'

	function get() {
		return type
	}

	function init() {
		if (globalThis.chrome?.storage === undefined) {
			type = 'localstorage'
			return 'localstorage'
		}

		if ((globalThis.startupStorage as AllStorage)?.local?.syncStorage) {
			type = 'webext-local'
			return 'webext-local'
		}

		return type
	}

	function change(type: 'sync' | 'local', data: Sync) {
		if (globalThis.chrome?.storage === undefined) {
			return
		}

		if (type === 'local') {
			chrome.storage.local.set({ syncStorage: data })
		}

		if (type === 'sync') {
			chrome.storage.local.remove('syncStorage').then(() => {
				chrome.storage.sync.set(data)
			})
		}
	}

	return { init, get, change }
}

//	Synced data

async function syncGet(key?: string | string[]): Promise<Sync> {
	switch (storage.type.get()) {
		case 'webext-sync': {
			const data = await chrome.storage.sync.get(key ?? null)
			return verifyDataAsSync(data)
		}

		case 'webext-local': {
			const data = (await chrome.storage.local.get('syncStorage')).syncStorage
			return verifyDataAsSync(data)
		}

		default: {
			return verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})
		}
	}
}

async function syncSet(keyval: Record<string, unknown>, fn = () => {}) {
	switch (storage.type.get()) {
		case 'webext-sync': {
			chrome.storage.sync.set(keyval, fn)
			return
		}

		case 'webext-local': {
			const data = {
				...(await chrome.storage.local.get('syncStorage')).syncStorage,
				...keyval,
			}

			chrome.storage.local.set({ syncStorage: data }, fn)
			return
		}

		case 'localstorage': {
			if (typeof keyval !== 'object') {
				return
			}

			const data = verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})

			for (const [k, v] of Object.entries(keyval)) {
				data[k] = v
			}

			localStorage.bonjourr = JSON.stringify(data ?? {})
			globalThis.dispatchEvent(new Event('storage'))
			return
		}

		default:
	}
}

async function syncRemove(key: string) {
	switch (storage.type.get()) {
		case 'webext-sync': {
			chrome.storage.sync.remove(key)
			return
		}

		case 'webext-local': {
			const data = (await chrome.storage.local.get('syncStorage')).syncStorage
			await chrome.storage.local.remove('syncStorage')
			delete data[key]
			chrome.storage.local.set({ syncStorage: data })
			return
		}

		case 'localstorage': {
			localStorage.removeItem(key)
			return
		}

		default:
	}
}

async function syncClear() {
	switch (storage.type.get()) {
		case 'webext-sync': {
			await chrome.storage.sync.clear()
			return
		}

		case 'webext-local': {
			await chrome.storage.local.remove('syncStorage')
			return
		}

		case 'localstorage': {
			localStorage.removeItem('bonjourr')
			return
		}

		default:
	}
}

//	Local data

function localSet(value: Record<string, unknown>) {
	switch (storage.type.get()) {
		case 'webext-sync':
		case 'webext-local': {
			chrome.storage.local.set(value)
			return
		}

		default: {
			for (const [key, val] of Object.entries(value)) {
				if (typeof val === 'string') {
					return localStorage.setItem(key, val)
				}

				return localStorage.setItem(key, JSON.stringify(val))
			}
			return
		}
	}
}

async function localGet(keys?: string | string[]): Promise<Local> {
	switch (storage.type.get()) {
		case 'webext-sync':
		case 'webext-local': {
			const data = await chrome.storage.local.get(keys)
			return data as Local
		}

		default: {
			const defaults = structuredClone(LOCAL_DEFAULT) as unknown
			const result: Record<string, unknown> = defaults as Record<string, unknown>

			keys ??= Object.keys(LOCAL_DEFAULT)

			if (typeof keys === 'string') {
				keys = [keys]
			}

			const localKeys = Object.keys(globalThis.localStorage)
			const neededKeys = keys.filter((k) => localKeys.includes(k))

			for (const key of neededKeys) {
				const item = globalThis.localStorage.getItem(key)
				const isJson = item && (item.startsWith('{') || item.startsWith('['))
				const isBool = item && (item === 'true' || item === 'false')
				const isNoom = item && Number.isNaN(Number.parseInt(item)) === false

				if (isJson) {
					result[key] = parse(item)
				} else if (isBool) {
					result[key] = item === 'true'
				} else if (isNoom) {
					result[key] = Number.parseFloat(item)
				} else {
					result[key] = item
				}
			}

			return result as unknown as Local
		}
	}
}

function localRemove(key: string) {
	switch (storage.type.get()) {
		case 'webext-sync':
		case 'webext-local': {
			return chrome.storage.local.remove(key)
		}

		case 'localstorage': {
			const data = verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})
			delete data[key]
			localStorage.bonjourr = JSON.stringify(data ?? {})
			return
		}

		default:
	}
}

async function localClear() {
	switch (storage.type.get()) {
		case 'webext-sync': {
			chrome.storage.local.clear()
			return
		}

		case 'webext-local': {
			const sync = (await chrome.storage.local.get('syncStorage')).syncStorage
			await chrome.storage.local.clear()
			await chrome.storage.local.set({ syncStorage: sync })
			return
		}

		case 'localstorage': {
			for (const key of Object.keys(LOCAL_DEFAULT)) {
				localStorage.removeItem(key)
			}
			return
		}

		default:
	}
}

//	Init data

async function init(): Promise<AllStorage> {
	const store: AllStorage = globalThis.startupStorage ?? {}

	if (PLATFORM !== 'online' && !webextStoreReady()) {
		globalThis.pageReady = true

		await new Promise((resolve) => {
			document.addEventListener('webextstorage', (event: CustomEventInit) => {
				if (event.detail === 'sync') {
					store.sync = globalThis.startupStorage.sync
				}
				if (event.detail === 'local') {
					store.local = globalThis.startupStorage.local
				}
				if (webextStoreReady()) {
					resolve(true)
				}
			})
		})
	}

	const type = storage.type.init()

	switch (type) {
		case 'webext-local': {
			store.sync = (globalThis.startupStorage as AllStorage).local?.syncStorage
			store.local = globalThis.startupStorage.local
			break
		}

		case 'webext-sync': {
			store.sync = (globalThis.startupStorage as AllStorage).sync
			store.local = (globalThis.startupStorage as AllStorage).local
			break
		}

		case 'localstorage': {
			store.sync = await syncGet()
			store.local = await localGet()
			break
		}

		default:
	}

	if (Object.keys(store.sync ?? {})?.length === 0) {
		store.sync = await getSyncDefaults()
	}

	const sync = verifyDataAsSync(store.sync)
	const local = verifyDataAsLocal(store.local)

	return {
		sync,
		local,
	}

	/** This waits for chrome.storage to be stored in a global variable,
		that is created in file `webext-storage.js` */
	function webextStoreReady(): boolean {
		return !!store.sync && !!store.local
	}
}

//	Clear all data

async function clearall() {
	sessionStorage.clear()
	localStorage.clear()
	idb.clear()

	//@ts-expect-error: Type 'undefined' is not assignable to type ...
	globalThis.startupStorage = undefined

	switch (storage.type.get()) {
		case 'webext-sync': {
			await chrome.storage.sync.clear()
			await chrome.storage.local.clear()

			chrome.storage.sync.set(SYNC_DEFAULT)
			chrome.storage.local.set(LOCAL_DEFAULT)

			return
		}

		case 'webext-local': {
			await chrome.storage.sync.clear()
			await chrome.storage.local.clear()

			chrome.storage.local.set({
				...LOCAL_DEFAULT,
				syncStorage: SYNC_DEFAULT,
			})

			return
		}

		default:
	}
}

//	Helpers

export async function getSyncDefaults(): Promise<Sync> {
	try {
		const json = await (await fetch('config.json')).json()
		return verifyDataAsSync(json)
	} catch (_) {
		// ...
	}

	return SYNC_DEFAULT
}

export function isStorageDefault(data: Sync): boolean {
	const current = structuredClone(data)
	current.review = SYNC_DEFAULT.review
	current.showall = SYNC_DEFAULT.showall
	current.weather.city = SYNC_DEFAULT.weather.city
	current.quotes.last = SYNC_DEFAULT.quotes.last

	return deepEqual(current, SYNC_DEFAULT)
}

function verifyDataAsSync(data: Partial<Sync> = {}): Sync {
	let sync = { ...SYNC_DEFAULT }

	sync.about.version = '0.0.0'
	sync = { ...sync, ...data }

	return sync
}

function verifyDataAsLocal(data: Partial<Local> = {}): Local {
	const local = { ...LOCAL_DEFAULT, ...data }
	return local
}
