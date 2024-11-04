import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

type StorageType = 'localstorage' | 'webext-sync' | 'webext-local'

interface AllStorage {
	sync: Sync.Storage
	local: Local.Storage
}

interface Storage {
	sync: {
		get: (key?: string | string[]) => Promise<Sync.Storage>
		set: (val: Record<string, unknown>) => void
		remove: (key: string) => void
		clear: () => Promise<void>
	}
	local: {
		get: (key: string | string[]) => Promise<Local.Storage>
		set: (val: Record<string, unknown>) => void
		remove: (key: string) => void
		clear: () => void
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
}

export default storage

//	Synced data  //
// ------------- //

async function syncGet(key?: string | string[]): Promise<Sync.Storage> {
	switch (storageType()) {
		case 'webext-sync': {
			const data = await chrome.storage.sync.get(key ?? null)
			return verifyDataAsSync(data)
		}

		case 'webext-local': {
			const data = (await chrome.storage.local.get('sync')).sync
			return verifyDataAsSync(data)
		}

		case 'localstorage': {
			return verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
		}
	}
}

async function syncSet(keyval: Record<string, unknown>, fn = () => {}) {
	switch (storageType()) {
		case 'webext-sync': {
			chrome.storage.sync.set(keyval, fn)
			return
		}

		case 'webext-local': {
			const data = {
				...(await chrome.storage.local.get('sync')).sync,
				...keyval,
			}

			chrome.storage.local.set({ sync: data }, fn)
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
	switch (storageType()) {
		case 'webext-sync': {
			chrome.storage.sync.remove(key)
			return
		}

		case 'webext-local': {
			const data = (await chrome.storage.local.get('sync')).sync
			await chrome.storage.local.remove('sync')
			delete data[key]
			chrome.storage.local.set({ sync: data })
		}

		case 'localstorage': {
			localStorage.removeItem(key)
			return
		}
	}
}

async function syncClear() {
	switch (storageType()) {
		case 'webext-sync': {
			await chrome.storage.sync.clear()
			return
		}

		case 'webext-local': {
			await chrome.storage.local.remove('sync')
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
	switch (storageType()) {
		case 'webext-sync':
		case 'webext-local': {
			chrome.storage.local.set(value)
			return
		}

		case 'localstorage': {
			const [key, val] = Object.entries(value)[0]
			return localStorage.setItem(key, JSON.stringify(val))
		}
	}
}

async function localGet(keys?: string | string[]): Promise<Local.Storage> {
	switch (storageType()) {
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
	switch (storageType()) {
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
	switch (storageType()) {
		case 'webext-sync': {
			chrome.storage.local.clear()
			return
		}

		case 'webext-local': {
			const sync = (await chrome.storage.local.get('sync')).sync
			await chrome.storage.local.clear()
			await chrome.storage.local.set({ sync: sync })
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
	//@ts-expect-error -> exists in webext-storage.js
	const store: AllStorage = globalThis.startupStorage ?? {}

	//@ts-expect-error -> don't worry about it
	globalThis.pageReady = true

	switch (storageType()) {
		case 'webext-sync':
			return await webextSyncInit()

		case 'webext-local':
			return await webextLocalInit()

		case 'localstorage':
			return await localStorageInit()
	}

	// Browser fn

	async function localStorageInit(): Promise<AllStorage> {
		store.sync = await syncGet()
		store.local = await localGet()

		return await finalizeStorageInit()
	}

	// Extension fn

	async function webextSyncInit(): Promise<AllStorage> {
		if (!webextStoreReady()) {
			await new Promise((resolve) => {
				document.addEventListener('webextstorage', function (event: CustomEventInit) {
					if (event.detail === 'sync') store.sync = (globalThis.startupStorage as AllStorage).sync
					if (event.detail === 'local') store.local = (globalThis.startupStorage as AllStorage).local
					if (webextStoreReady()) resolve(true)
				})
			})
		}

		return await finalizeStorageInit()
	}

	async function webextLocalInit(): Promise<AllStorage> {
		if (!webextStoreReady()) {
			await new Promise((resolve) => {
				document.addEventListener('webextstorage', function (event: CustomEventInit) {
					if (event.detail === 'local') {
						const local = (globalThis.startupStorage as AllStorage).local
						const sync = ((globalThis.startupStorage as AllStorage).local?.sync ?? {}) as Sync.Storage

						store.sync = sync
						store.local = local
						delete store.local.sync

						resolve(true)
					}
				})
			})
		} else {
			const sync = (globalThis.startupStorage as AllStorage).local?.sync ?? {}
			store.sync = sync as Sync.Storage
			delete store.local.sync
		}

		return await finalizeStorageInit()
	}

	async function finalizeStorageInit(): Promise<AllStorage> {
		if (Object.keys(store.sync)?.length === 0) {
			store.sync = await getSyncDefaults()
		}
		//
		else if (store.sync.settingssync?.type === 'gist') {
			console.log('Update with github')
			// ...
		}
		//
		else if (store.sync.settingssync?.type === 'url') {
			console.log('Update with distant URL')
			// ...
		}

		const sync = verifyDataAsSync(store.sync)
		const local = verifyDataAsLocal(store.local)

		//@ts-expect-error -> exists in webext-storage.js
		delete globalThis.startupStorage

		return { sync, local }
	}

	// This waits for chrome.storage to be stored in a global variable
	// that is created in file `webext-storage.js`
	function webextStoreReady(): boolean {
		return 'sync' in store && 'local' in store
	}
}

//	Clear all data  //
// ---------------- //

async function clearall() {
	sessionStorage.clear()
	localStorage.clear()

	//@ts-expect-error
	delete globalThis.startupStorage

	switch (storageType()) {
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
				sync: SYNC_DEFAULT,
			})

			sessionStorage.WEBEXT_LOCAL = 'yes'
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
		//@ts-expect-error -> error.stack always gives error lol
		console.log(error.stack)
	}

	return SYNC_DEFAULT
}

function storageType(): StorageType {
	if (PLATFORM !== 'online') {
		const { local, sync } = (globalThis.startupStorage as AllStorage) ?? {}
		const fromStartupStorage = sync?.settingssync?.type ?? local?.sync?.settingssync?.type
		const fromSession = sessionStorage.getItem('WEBEXT_LOCAL') === 'yes' ? 'off' : undefined
		const type = fromSession ?? fromStartupStorage ?? 'auto'

		if (type === 'off') {
			return 'webext-local'
		} else {
			return 'webext-sync'
		}
	}

	return 'localstorage'
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
