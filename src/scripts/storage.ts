import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

type Keyval = {
	[key: string]: unknown
}

type AllStorage = {
	sync: Sync.Storage
	local: Local.Storage
}

type Storage = {
	sync: {
		get: (key?: string | string[]) => Promise<Sync.Storage>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	local: {
		get: (key: string | string[]) => Promise<Local.Storage>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	init: () => Promise<AllStorage>
}

function verifyDataAsSync(data: Keyval) {
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

function verifyDataAsLocal(data: Keyval) {
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
		//@ts-expect-error
		console.log(error.stack)
	}

	return SYNC_DEFAULT
}

function online(): Storage {
	const sync = {
		set: function (value: Keyval) {
			if (typeof value !== 'object') {
				return console.warn('Value is not an object: ', value)
			}

			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})

			for (const [key, val] of Object.entries(value)) {
				data[key] = val
			}

			localStorage.bonjourr = JSON.stringify(data ?? {})
			window.dispatchEvent(new Event('storage'))
		},

		get: async (_?: string | string[]) => {
			return verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
		},

		remove: (key: string) => {
			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
			delete data[key]
			localStorage.bonjourr = JSON.stringify(data ?? {})
		},

		clear: () => {
			localStorage.removeItem('bonjourr')
		},
	}

	const local = {
		set: (value: Keyval) => {
			const [key, val] = Object.entries(value)[0]
			return localStorage.setItem(key, JSON.stringify(val))
		},

		get: async (keys?: string | string[]) => {
			const res: Keyval = {}

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
		},

		remove: (key: string) => {
			return localStorage.removeItem(key)
		},

		clear: () => {
			for (const key of Object.keys(LOCAL_DEFAULT)) {
				localStorage.removeItem(key)
			}
		},
	}

	const init = async () => {
		const config = await getSyncDefaults()
		const about = parse<Sync.Storage>(localStorage.bonjourr)?.about

		if (!localStorage.bonjourr) {
			online().sync.set(config)
		}

		if (!about) {
			online().sync.set({ about: config.about })
		}

		return {
			sync: verifyDataAsSync(await sync.get()),
			local: verifyDataAsLocal(await local.get()),
		}
	}

	return {
		sync,
		local,
		init,
	}
}

function webext(): Storage {
	const sync = {
		set: (val: Keyval, cb = (): void => {}) => {
			chrome.storage.sync.set(val, cb)
		},

		get: async (key?: string | string[]): Promise<Sync.Storage> => {
			const data = await chrome.storage.sync.get(key ?? null)
			return verifyDataAsSync(data)
		},

		remove: (key: string) => {
			chrome.storage.sync.remove(key)
		},

		clear: () => {
			chrome.storage.sync.clear()
		},
	}

	const local = {
		set: (val: Keyval) => {
			chrome.storage.local.set(val)
		},

		get: async (key: string | string[]) => {
			return (await chrome.storage.local.get(key ?? null)) as Local.Storage
		},

		remove: (key: string) => {
			return chrome.storage.local.remove(key)
		},

		clear: () => {
			chrome.storage.local.clear()
		},
	}

	const init = async (): Promise<AllStorage> => {
		// This waits for chrome.storage to be stored in a global variable
		// that is created in file `webext-storage.js`

		//@ts-expect-error
		const store: AllStorage = window.startupStorage
		const isReady = (): boolean => 'sync' in store && 'local' in store

		if (!isReady()) {
			await new Promise((resolve) => {
				document.addEventListener('webextstorage', function (event: CustomEventInit) {
					if (event.detail === 'sync') store.sync = (window.startupStorage as any).sync
					if (event.detail === 'local') store.local = (window.startupStorage as any).local
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

	return {
		sync,
		local,
		init,
	}
}

export default PLATFORM === 'online' ? online() : webext()
