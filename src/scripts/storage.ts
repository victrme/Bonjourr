import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

type StorageType = 'localstorage' | 'webext-sync' | 'webext-local'

interface AllStorage {
	sync?: Sync.Storage
	local?: Local.Storage
}

interface Storage {
	sync: {
		get: (key?: string | string[]) => Promise<Sync.Storage>
		set: (val: Partial<Sync.Storage>) => void
		remove: (key: string) => void
		clear: () => Promise<void>
	}
	local: {
		get: (key?: keyof Local.Storage | (keyof Local.Storage)[]) => Promise<Local.Storage>
		set: (val: Partial<Local.Storage>) => void
		remove: (key: keyof Local.Storage) => void
		clear: () => void
	}
	type: {
		get: () => StorageType
		change: (type: 'sync' | 'local', data: Sync.Storage) => void
		init: () => void
	}
	init: () => Promise<AllStorage>
	clearall: () => Promise<void>
}

const storage: Storage = {
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

export default storage

//	Storage type   //
// --------------- //

function storageTypeFn() {
	let type: StorageType = 'webext-sync'

	function get() {
		return type
	}

	function init() {
		if (globalThis.chrome?.storage === undefined) {
			type = 'localstorage'
			return
		}

		if (!!(globalThis.startupStorage as AllStorage)?.local?.syncStorage) {
			type = 'webext-local'
			return
		}
	}

	function change(type: 'sync' | 'local', data: Sync.Storage) {
		if (globalThis.chrome?.storage === undefined) {
			return
		}

		if (type === 'local') {
			chrome.storage.local.set({ syncStorage: data })
		}

		if (type === 'sync') {
			chrome.storage.local.remove('syncStorage').then(function () {
				chrome.storage.sync.set(data)
			})
		}
	}

	return { init, get, change }
}

//	Synced data  //
// ------------- //

async function syncGet(key?: string | string[]): Promise<Sync.Storage> {
	switch (storage.type.get()) {
		case 'webext-sync': {
			const data = await chrome.storage.sync.get(key ?? null)
			return verifyDataAsSync(data)
		}

		case 'webext-local': {
			const data = (await chrome.storage.local.get('syncStorage')).syncStorage
			return verifyDataAsSync(data)
		}

		case 'localstorage': {
			return verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
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
				return console.warn('Value is not an object: ', keyval)
			}

			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})

			for (const [k, v] of Object.entries(keyval)) {
				data[k] = v
			}

			localStorage.bonjourr = JSON.stringify(data ?? {})
			window.dispatchEvent(new Event('storage'))
		}
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
		}

		case 'localstorage': {
			localStorage.removeItem(key)
			return
		}
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
	}
}

//	Local data  //
// ------------ //

function localSet(value: Record<string, unknown>) {
	switch (storage.type.get()) {
		case 'webext-sync':
		case 'webext-local': {
			chrome.storage.local.set(value)
			return
		}

		case 'localstorage': {
			for (const [key, val] of Object.entries(value)) {
				if (typeof val === 'string') {
					return localStorage.setItem(key, val)
				} else {
					return localStorage.setItem(key, JSON.stringify(val))
				}
			}
		}
	}
}

async function localGet(keys?: string | string[]): Promise<Local.Storage> {
	switch (storage.type.get()) {
		case 'webext-sync':
		case 'webext-local': {
			const data = await chrome.storage.local.get(keys)
			return data as Local.Storage
		}

		case 'localstorage': {
			const res: Record<string, unknown> = {}

			if (keys === undefined) {
				keys = [...Object.keys(localStorage).filter((k) => k !== 'bonjourr')]
			} //
			else if (typeof keys === 'string') {
				keys = [keys]
			}

			for (const key of keys) {
				const item = localStorage.getItem(key) ?? ''
				const isJson = item.startsWith('{') || item.startsWith('[')
				const val = isJson ? parse<Partial<Local.Storage>>(item) : item

				if (val) {
					res[key] = val
				}
			}

			return res as Local.Storage
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
			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
			delete data[key]
			localStorage.bonjourr = JSON.stringify(data ?? {})
		}
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
		}
	}
}

//	Init data  //
// ----------- //

async function init(): Promise<AllStorage> {
	const store: AllStorage = globalThis.startupStorage ?? {}

	if (PLATFORM !== 'online' && !webextStoreReady()) {
		globalThis.pageReady = true

		await new Promise((resolve) => {
			document.addEventListener('webextstorage', function (event: CustomEventInit) {
				if (event.detail === 'sync') store.sync = globalThis.startupStorage.sync
				if (event.detail === 'local') store.local = globalThis.startupStorage.local
				if (webextStoreReady()) resolve(true)
			})
		})
	}

	storage.type.init()

	switch (storage.type.get()) {
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
	}

	if (Object.keys(store.sync ?? {})?.length === 0) {
		store.sync = await getSyncDefaults()
	}

	const sync = verifyDataAsSync(store.sync ?? {})
	const local = verifyDataAsLocal(store.local ?? {})

	return {
		sync,
		local,
	}

	/** This waits for chrome.storage to be stored in a global variable, that is created in file `webext-storage.js` */
	function webextStoreReady(): boolean {
		return !!store.sync && !!store.local
	}
}

//	Clear all data  //
// ---------------- //

async function clearall() {
	sessionStorage.clear()
	localStorage.clear()

	//@ts-expect-error: The operand of a 'delete' operator must be optional.
	delete globalThis.startupStorage

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
	}
}

//	Helpers  //
// --------- //

export async function getSyncDefaults(): Promise<Sync.Storage> {
	try {
		const json = await (await fetch('config.json')).json()
		return verifyDataAsSync(json)
	} catch (error) {
		console.log((error as Error).stack)
	}

	return SYNC_DEFAULT
}

export function isStorageDefault(data: Sync.Storage): boolean {
	const current = structuredClone(data)
	current.review = SYNC_DEFAULT.review
	current.showall = SYNC_DEFAULT.showall
	current.unsplash.time = SYNC_DEFAULT.unsplash.time
	current.unsplash.pausedImage = SYNC_DEFAULT.unsplash.pausedImage
	current.weather.city = SYNC_DEFAULT.weather.city
	current.quotes.last = SYNC_DEFAULT.quotes.last
	current.settingssync.type = 'browser'

	return deepEqual(current, SYNC_DEFAULT)

	// https://dmitripavlutin.com/how-to-compare-objects-in-javascript/#4-deep-equality
	function deepEqual(object1: Record<string, unknown>, object2: Record<string, unknown>) {
		const keys1 = Object.keys(object1)
		const keys2 = Object.keys(object2)

		if (keys1.length !== keys2.length) {
			return false
		}

		for (const key of keys1) {
			const val1 = object1[key]
			const val2 = object2[key]
			const areObjects = isObject(val1) && isObject(val2)
			const areDifferent = (areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)

			if (areDifferent) {
				console.log(val1, val2)
				return false
			}
		}

		return true
	}

	function isObject(object: unknown) {
		return object != null && typeof object === 'object'
	}
}

function verifyDataAsSync(data: Record<string, unknown>) {
	data = data ?? {}

	for (const key in SYNC_DEFAULT) {
		const notAbout = key !== 'about'
		const missingKey = !(key in data)

		if (notAbout && missingKey) {
			data[key] = SYNC_DEFAULT[key]
		}
	}

	return data as Sync.Storage
}

function verifyDataAsLocal(data: Record<string, unknown>) {
	data = data ?? {}

	for (const key in LOCAL_DEFAULT) {
		if (!(key in data)) {
			data[key] = LOCAL_DEFAULT[key as keyof typeof LOCAL_DEFAULT]
		}
	}

	return data as Local.Storage
}
