import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

type Keyval = {
	[key: string]: unknown
}

type AllStorage = { sync: Sync.Storage; local: Local.Storage }

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
		if (!(key in data) && key !== 'move') {
			data[key] = SYNC_DEFAULT[key]
		}
	}

	return data as Sync.Storage
}

export async function getSyncDefaults(): Promise<Sync.Storage> {
	try {
		const json = await (await fetch('defaults.json')).json()
		return verifyDataAsSync(json)
	} catch (error) {
		console.log('No defaults.json settings found')
	}

	return SYNC_DEFAULT
}

function online(): Storage {
	const sync = {
		set: function (value: Keyval) {
			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})

			if (typeof value !== 'object') {
				return console.warn('Value is not an object: ', value)
			}

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
				const val = parse<Partial<Local.Storage>>(localStorage.getItem(key) ?? '')
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
		return {
			sync: await sync.get(),
			local: await local.get(),
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

		//@ts-ignore
		const store = startupStorage as AllStorage
		const isReady = (): boolean => 'sync' in store && 'local' in store

		if (!isReady()) {
			await new Promise((resolve) => {
				document.addEventListener('webextstorage', function () {
					isReady() ? resolve(true) : ''
				})
			})
		}

		const sync = store.sync
		const local = store.local

		//@ts-ignore
		startupStorage = undefined

		return { sync, local }
	}

	return {
		sync,
		local,
		init,
	}
}

export default PLATFORM === 'online' ? online() : webext()
