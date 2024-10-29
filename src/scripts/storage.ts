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
			const data = await chrome.storage.local.get('sync')
			return verifyDataAsSync(data)
		}

		case 'localstorage': {
			return verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
		}
	}
}

async function syncSet(keyval: Record<string, unknown>, cb = () => {}) {
	switch (storageType()) {
		case 'webext-sync': {
			chrome.storage.sync.set(keyval, cb)
			return
		}

		case 'webext-local': {
			const data = await chrome.storage.local.get('sync')

			for (const [k, v] of Object.entries(keyval)) {
				data[k] = v
			}

			chrome.storage.local.set({ sync: data })
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
			const data = await chrome.storage.local.get('sync')
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
			const sync = chrome.storage.local.get('sync')
			await chrome.storage.local.clear()
			await chrome.storage.local.set({ sync })
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
	switch (storageType()) {
		case 'webext-sync': {
			// This waits for chrome.storage to be stored in a global variable
			// that is created in file `webext-storage.js`

			//@ts-expect-error -> exists in webext-storage.js
			const store: AllStorage = globalThis.startupStorage
			const isReady = (): boolean => 'sync' in store && 'local' in store

			if (!isReady()) {
				await new Promise((resolve) => {
					document.addEventListener('webextstorage', function (event: CustomEventInit) {
						if (event.detail === 'sync') store.sync = (window.startupStorage as AllStorage).sync
						if (event.detail === 'local') store.local = (window.startupStorage as AllStorage).local
						if (isReady()) resolve(true)
					})
				})
			}

			if (Object.keys(store.sync)?.length === 0) {
				store.sync = await getSyncDefaults()
			}

			const sync = verifyDataAsSync(store.sync)
			const local = verifyDataAsLocal(store.local)

			return { sync, local }
		}

		case 'webext-local': {
			// This waits for chrome.storage to be stored in a global variable
			// that is created in file `webext-storage.js`

			//@ts-expect-error -> exists in webext-storage.js
			const store: AllStorage = globalThis.startupStorage
			const isReady = (): boolean => 'sync' in store && 'local' in store

			if (!isReady()) {
				await new Promise((resolve) => {
					document.addEventListener('webextstorage', function (event: CustomEventInit) {
						const startupLocal = (window.startupStorage as AllStorage).local
						if (event.detail === 'sync' && startupLocal.sync) store.sync = startupLocal.sync
						if (event.detail === 'local') store.local = startupLocal
						if (isReady()) resolve(true)
					})
				})
			}

			if (Object.keys(store.sync)?.length === 0) {
				store.sync = await getSyncDefaults()
			}

			const sync = verifyDataAsSync(store.sync)
			const local = verifyDataAsLocal(store.local)

			return { sync, local }
		}

		case 'localstorage': {
			const config = await getSyncDefaults()
			const about = parse<Sync.Storage>(localStorage.bonjourr)?.about

			if (!localStorage.bonjourr) {
				syncSet(config)
			}

			if (!about) {
				syncSet({ about: config.about })
			}

			return {
				sync: verifyDataAsSync(await syncGet()),
				local: verifyDataAsLocal(await localGet()),
			}
		}
	}
}

//	Helpers  //
// --------- //

function storageType(): StorageType {
	if (PLATFORM !== 'online') {
		if (localStorage.storageType === 'webext-local') {
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
